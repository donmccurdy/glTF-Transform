import type { Extension } from './extension.js';
import { Graph } from 'property-graph';
import {
	Accessor,
	Animation,
	AnimationChannel,
	AnimationSampler,
	Buffer,
	Camera,
	Material,
	Mesh,
	Node,
	Primitive,
	PrimitiveTarget,
	Property,
	Root,
	Scene,
	Skin,
	Texture,
} from './properties/index.js';
import { ILogger, Logger } from './utils/index.js';

export interface TransformContext {
	stack: string[];
}

export type Transform = (doc: Document, context?: TransformContext) => void;

/**
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
 * import fs from 'fs/promises';
 * import { Document } from '@gltf-transform/core';
 * import { dedup } from '@gltf-transform/functions';
 *
 * const document = new Document();
 *
 * const texture1 = document.createTexture('myTexture')
 * 	.setImage(await fs.readFile('path/to/image.png'))
 * 	.setMimeType('image/png');
 * const texture2 = document.createTexture('myTexture2')
 * 	.setImage(await fs.readFile('path/to/image2.png'))
 * 	.setMimeType('image/png');
 *
 * // Document containing duplicate copies of the same texture.
 * document.getRoot().listTextures(); // → [texture x 2]
 *
 * await document.transform(
 * 	dedup({textures: true}),
 * 	// ...
 * );
 *
 * // Document with duplicate textures removed.
 * document.getRoot().listTextures(); // → [texture x 1]
 * ```
 *
 * Reference:
 * - [glTF → Basics](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#gltf-basics)
 * - [glTF → Concepts](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#concepts)
 *
 * @category Documents
 */
export class Document {
	private _graph: Graph<Property> = new Graph<Property>();
	private _root: Root = new Root(this._graph);
	private _logger: ILogger = Logger.DEFAULT_INSTANCE;

	/**
	 * Enables lookup of a Document from its Graph. For internal use, only.
	 * @internal
	 * @experimental
	 */
	private static _GRAPH_DOCUMENTS = new WeakMap<Graph<Property>, Document>();

	/**
	 * Returns the Document associated with a given Graph, if any.
	 * @hidden
	 * @experimental
	 */
	public static fromGraph(graph: Graph<Property>): Document | null {
		return Document._GRAPH_DOCUMENTS.get(graph) || null;
	}

	/** Creates a new Document, representing an empty glTF asset. */
	public constructor() {
		Document._GRAPH_DOCUMENTS.set(this._graph, this);
	}

	/** Returns the glTF {@link Root} property. */
	public getRoot(): Root {
		return this._root;
	}

	/**
	 * Returns the {@link Graph} representing connectivity of resources within this document.
	 * @hidden
	 */
	public getGraph(): Graph<Property> {
		return this._graph;
	}

	/** Returns the {@link Logger} instance used for any operations performed on this document. */
	public getLogger(): ILogger {
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
	public setLogger(logger: ILogger): Document {
		this._logger = logger;
		return this;
	}

	/**
	 * Clones this Document, copying all resources within it.
	 * @deprecated Use 'cloneDocument(document)' from '@gltf-transform/functions'.
	 * @hidden
	 * @internal
	 */
	public clone(): Document {
		throw new Error(`Use 'cloneDocument(source)' from '@gltf-transform/functions'.`);
	}

	/**
	 * Merges the content of another Document into this one, without affecting the original.
	 * @deprecated Use 'mergeDocuments(target, source)' from '@gltf-transform/functions'.
	 * @hidden
	 * @internal
	 */
	public merge(_other: Document): this {
		throw new Error(`Use 'mergeDocuments(target, source)' from '@gltf-transform/functions'.`);
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
		const stack = transforms.map((fn) => fn.name);
		for (const transform of transforms) {
			await transform(this, { stack });
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
		const extensionName = (ctor as unknown as { EXTENSION_NAME: 'string' }).EXTENSION_NAME;
		const prevExtension = this.getRoot()
			.listExtensionsUsed()
			.find((ext) => ext.extensionName === extensionName);
		return (prevExtension || new ctor(this)) as T;
	}

	/**********************************************************************************************
	 * Property factory methods.
	 */

	/** Creates a new {@link Scene} attached to this document's {@link Root}. */
	createScene(name = ''): Scene {
		return new Scene(this._graph, name);
	}

	/** Creates a new {@link Node} attached to this document's {@link Root}. */
	createNode(name = ''): Node {
		return new Node(this._graph, name);
	}

	/** Creates a new {@link Camera} attached to this document's {@link Root}. */
	createCamera(name = ''): Camera {
		return new Camera(this._graph, name);
	}

	/** Creates a new {@link Skin} attached to this document's {@link Root}. */
	createSkin(name = ''): Skin {
		return new Skin(this._graph, name);
	}

	/** Creates a new {@link Mesh} attached to this document's {@link Root}. */
	createMesh(name = ''): Mesh {
		return new Mesh(this._graph, name);
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
		return new Material(this._graph, name);
	}

	/** Creates a new {@link Texture} attached to this document's {@link Root}. */
	createTexture(name = ''): Texture {
		return new Texture(this._graph, name);
	}

	/** Creates a new {@link Animation} attached to this document's {@link Root}. */
	createAnimation(name = ''): Animation {
		return new Animation(this._graph, name);
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
		return new Accessor(this._graph, name).setBuffer(buffer);
	}

	/** Creates a new {@link Buffer} attached to this document's {@link Root}. */
	createBuffer(name = ''): Buffer {
		return new Buffer(this._graph, name);
	}
}
