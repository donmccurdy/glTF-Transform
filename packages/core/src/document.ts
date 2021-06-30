import { PropertyType } from './constants';
import { Extension } from './extension';
import { Accessor, Animation, AnimationChannel, AnimationSampler, Buffer, Camera, ExtensionProperty, Material, Mesh, Node, Primitive, PrimitiveTarget, Property, PropertyGraph, Root, Scene, Skin, Texture } from './properties';
import { Logger } from './utils';

export type Transform = (doc: Document) => void;

/**
 * # Document
 *
 * *Wraps a glTF asset and its resources for easier modification.*
 *
 * Documents manage glTF assets and the relationships among dependencies. The document wrapper
 * allow tools to read and write changes without dealing with array indices or byte offsets, which
 * would otherwise require careful management over the course of a file modification. An internal
 * graph structure allows any property in the glTF file to maintain references to its dependencies,
 * and makes it easy to determine where a particular property dependency is being used. For
 * example, finding a list of materials that use a particular texture is as simple as calling
 * {@link Texture.listParents}().
 *
 * A new resource {@link Property} (e.g. a {@link Mesh} or {@link Material}) is created by calling
 * 'create' methods on the document. Resources are destroyed by calling {@link Property.dispose}().
 *
 * ```ts
 * import { Document } from '@gltf-transform/core';
 * import { dedup } from '@gltf-transform/functions';
 *
 * const doc = new Document();
 *
 * const texture1 = doc.createTexture('myTexture')
 * 	.setImage(arrayBuffer)
 * 	.setMimeType('image/png');
 * const texture2 = doc.createTexture('myTexture2')
 * 	.setImage(arrayBuffer)
 * 	.setMimeType('image/png');
 *
 * // Document containing duplicate copies of the same texture.
 * doc.getRoot().listTextures(); // → [texture x 2]
 *
 * await doc.transform(
 * 	dedup({textures: true}),
 * 	// ...
 * );
 *
 * // Document with duplicate textures removed.
 * doc.getRoot().listTextures(); // → [texture x 1]
 * ```
 *
 * Reference:
 * - [glTF → Basics](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#gltf-basics)
 * - [glTF → Concepts](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#concepts)
 *
 * @category Documents
 */
export class Document {
	private _graph: PropertyGraph = new PropertyGraph();
	private _root: Root = new Root(this._graph);
	private _logger = Logger.DEFAULT_INSTANCE;

	/** Returns the glTF {@link Root} property. */
	public getRoot(): Root {
		return this._root;
	}

	/**
	 * Returns the {@link Graph} representing connectivity of resources within this document.
	 *
	 * @hidden
	 */
	public getGraph(): PropertyGraph {
		return this._graph;
	}

	/** Returns the {@link Logger} instance used for any operations performed on this document. */
	public getLogger(): Logger {
		return this._logger;
	}

	/**
	 * Overrides the {@link Logger} instance used for any operations performed on this document.
	 *
	 * Usage:
	 *
	 * ```ts
	 * doc
	 * 	.setLogger(new Logger(Logger.Verbosity.SILENT))
	 * 	.transform(dedup(), weld());
	 * ```
	 */
	public setLogger(logger: Logger): Document {
		this._logger = logger;
		return this;
	}

	/** Clones this Document, copying all resources within it. */
	public clone(): Document {
		return new Document().merge(this).setLogger(this._logger);
	}

	/** Merges the content of another Document into this one, without affecting the original. */
	public merge(other: Document): this {
		// 1. Attach extensions.
		const thisExtensions: {[key: string]: Extension} = {};
		for (const otherExtension of other.getRoot().listExtensionsUsed()) {
			const thisExtension = this.createExtension(
				otherExtension.constructor as new (doc: Document) => Extension
			);
			if (otherExtension.isRequired()) thisExtension.setRequired(true);
			thisExtensions[thisExtension.extensionName] = thisExtension;
		}

		// 2. Preconfigure the Root and merge history.
		const visited = new Set<Property>();
		const propertyMap = new Map<Property, Property>();
		visited.add(other._root);
		propertyMap.set(other._root, this._root);

		// 3. Create stub classes for every Property in other Document.
		for (const link of other._graph.getLinks()) {
			for (const thisProp of [link.getParent() as Property, link.getChild() as Property]) {
				if (visited.has(thisProp)) continue;

				let otherProp: Property;
				if (thisProp.propertyType === PropertyType.TEXTURE_INFO) {
					// TextureInfo lifecycle is bound to a Material or ExtensionProperty.
					// TODO(cleanup): Should the lifecycle be decoupled? Maybe just create
					// TextureInfo automatically when appending a Texture to a Material or
					// ExtensionProperty that doesn't have one? More work for extensions.
					otherProp = thisProp as Property;
				} else {
					// For other property types, create stub classes.
					const PropertyClass = thisProp.constructor as
						new(g: PropertyGraph, e?: Extension) => Property;
					otherProp = thisProp instanceof ExtensionProperty
						? new PropertyClass(this._graph, thisExtensions[thisProp.extensionName])
						: new PropertyClass(this._graph);
				}

				propertyMap.set(thisProp as Property, otherProp);
				visited.add(thisProp);
			}
		}

		// 4. Assemble the links between Properties.
		const resolve = (p: Property): Property => {
			const resolved = propertyMap.get(p);
			if (!resolved) throw new Error('Could resolve property.');
			return resolved;
		};
		for (const otherProp of visited) {
			const thisProp = propertyMap.get(otherProp);
			if (!thisProp) throw new Error('Could resolve property.');
			thisProp.copy(otherProp, resolve);
		}

		return this;
	}

	/**
	 * Applies a series of modifications to this document. Each transformation is asynchronous,
	 * takes the {@link Document} as input, and returns nothing. Transforms are applied in the
	 * order given, which may affect the final result.
	 *
	 * Usage:
	 *
	 * ```ts
	 * await doc.transform(
	 * 	dedup(),
	 * 	prune()
	 * );
	 * ```
	 *
	 * @param transforms List of synchronous transformation functions to apply.
	 */
	public async transform(...transforms: Transform[]): Promise<this> {
		for (const transform of transforms) {
			await transform(this);
		}
		return this;
	}

	/**********************************************************************************************
	 * Extension factory method.
	 */

	/**
	 * Creates a new {@link Extension}, for the extension type of the given constructor. If the
	 * extension is already enabled for this Document, the previous Extension reference is reused.
	 */
	createExtension<T extends Extension>(ctor: new (doc: Document) => T): T {
		const extensionName = (ctor as unknown as {EXTENSION_NAME: 'string'}).EXTENSION_NAME;
		const prevExtension = this.getRoot().listExtensionsUsed()
			.find((ext) => ext.extensionName === extensionName);
		return (prevExtension || new ctor(this)) as T;
	}

	/**********************************************************************************************
	 * Property factory methods.
	 */

	/** Creates a new {@link Scene} attached to this document's {@link Root}. */
	createScene(name = ''): Scene {
		const scene = new Scene(this._graph, name);
		this._root._addScene(scene);
		return scene;
	}

	/** Creates a new {@link Node} attached to this document's {@link Root}. */
	createNode(name = ''): Node {
		const node = new Node(this._graph, name);
		this._root._addNode(node);
		return node;
	}

	/** Creates a new {@link Camera} attached to this document's {@link Root}. */
	createCamera(name = ''): Camera {
		const camera = new Camera(this._graph, name);
		this._root._addCamera(camera);
		return camera;
	}

	/** Creates a new {@link Skin} attached to this document's {@link Root}. */
	createSkin(name = ''): Skin {
		const skin = new Skin(this._graph, name);
		this._root._addSkin(skin);
		return skin;
	}

	/** Creates a new {@link Mesh} attached to this document's {@link Root}. */
	createMesh(name = ''): Mesh {
		const mesh = new Mesh(this._graph, name);
		this._root._addMesh(mesh);
		return mesh;
	}

	/**
	 * Creates a new {@link Primitive}. Primitives must be attached to a {@link Mesh}
	 * for use and export; they are not otherwise associated with a {@link Root}.
	 */
	createPrimitive(): Primitive {
		return new Primitive(this._graph);
	}

	/**
	 * Creates a new {@link PrimitiveTarget}, or morph target. Targets must be attached to a
	 * {@link Primitive} for use and export; they are not otherwise associated with a {@link Root}.
	 */
	createPrimitiveTarget(name = ''): PrimitiveTarget {
		return new PrimitiveTarget(this._graph, name);
	}

	/** Creates a new {@link Material} attached to this document's {@link Root}. */
	createMaterial(name = ''): Material {
		const material = new Material(this._graph, name);
		this._root._addMaterial(material);
		return material;
	}

	/** Creates a new {@link Texture} attached to this document's {@link Root}. */
	createTexture(name = ''): Texture {
		const texture = new Texture(this._graph, name);
		this._root._addTexture(texture);
		return texture;
	}

	/** Creates a new {@link Animation} attached to this document's {@link Root}. */
	createAnimation(name = ''): Animation {
		const animation = new Animation(this._graph, name);
		this._root._addAnimation(animation);
		return animation;
	}

	/**
	 * Creates a new {@link AnimationChannel}. Channels must be attached to an {@link Animation}
	 * for use and export; they are not otherwise associated with a {@link Root}.
	 */
	createAnimationChannel(name = ''): AnimationChannel {
		return new AnimationChannel(this._graph, name);
	}

	/**
	 * Creates a new {@link AnimationSampler}. Samplers must be attached to an {@link Animation}
	 * for use and export; they are not otherwise associated with a {@link Root}.
	 */
	createAnimationSampler(name = ''): AnimationSampler {
		return new AnimationSampler(this._graph, name);
	}

	/** Creates a new {@link Accessor} attached to this document's {@link Root}. */
	createAccessor(name = '', buffer: Buffer | null = null): Accessor {
		if (!buffer) {
			buffer = this.getRoot().listBuffers()[0];
		}
		const accessor = new Accessor(this._graph, name).setBuffer(buffer);
		this._root._addAccessor(accessor);
		return accessor;
	}

	/** Creates a new {@link Buffer} attached to this document's {@link Root}. */
	createBuffer(name = ''): Buffer {
		const buffer = new Buffer(this._graph, name);
		this._root._addBuffer(buffer);
		return buffer;
	}
}
