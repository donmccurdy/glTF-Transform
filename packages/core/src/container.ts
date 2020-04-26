import { Accessor, Buffer, Material, Mesh, Node, Primitive, PropertyGraph, Root, Scene, Texture } from './properties/index';
import { Logger } from './utils';

export type Transform = (container: Container) => void;

/**
 * Wraps a glTF asset, and tracks the dependencies among its resources.
 *
 * A new resource {@link Property} (e.g. a {@link Mesh} or {@link Material}) is created by calling
 * factory methods on the container, `container.create*(name)`. Resources are destroyed by calling
 * {@link Property.dispose}().
 *
 * Reference:
 * - [glTF → Basics](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#gltf-basics)
 * - [glTF → Concepts](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#concepts)
 */
export class Container {
	private graph: PropertyGraph = new PropertyGraph();
	private root: Root = new Root(this.graph);
	private logger = new Logger(Logger.Verbosity.INFO);

	/** Returns the glTF {@link Root} property. */
	public getRoot(): Root {
		return this.root;
	}

	/**
	 * Returns the {@link Graph} representing connectivity of resources within this container.
	 *
	 * @hidden
	 */
	public getGraph(): PropertyGraph {
		return this.graph;
	}

	/** Returns the {@link Logger} instance used for any operations performed on this container. */
	public getLogger(): Logger {
		return this.logger;
	}

	/**
	 * Overrides the {@link Logger} instance used for any operations performed on this container.
	 *
	 * Usage:
	 *
	 * ```ts
	 * container
	 * 	.setLogger(new Logger(Logger.Verbosity.SILENT))
	 * 	.transform(split(), ao({samples: 50}));
	 * ```
	 */
	public setLogger(logger: Logger): Container {
		this.logger = logger;
		return this;
	}

	/**
	 * Clones this container and its graph, copying all resources within it.
	 *
	 * Usage:
	 *
	 * ```ts
	 * container.transform(
	 * 	ao({samples: 500}),
	 * 	prune()
	 * );
	 * ```
	 *
	 * @hidden
	 */
	public clone(): Container {
		throw new Error('Not implemented.');
	}

	/**
	 * Applies a series of modifications to this container. Each transformation is synchronous,
	 * takes the {@link Container} as input, and returns nothing. Transforms are applied in the
	 * order given, which may affect the final result.
	 *
	 * @param transforms List of synchronous transformation functions to apply.
	 */
	public transform(...transforms: Transform[]): Container {
		for (const transform of transforms) {
			transform(this);
		}
		return this;
	}

	/**********************************************************************************************
	 * Property factory methods.
	 */

	/** Creates a new {@link Scene} attached to this container's {@link Root}. */
	createScene(name: string): Scene {
		const scene = new Scene(this.graph, name);
		this.root.addScene(scene);
		return scene;
	}

	/** Creates a new {@link Node} attached to this container's {@link Root}. */
	createNode(name: string): Node {
		const node = new Node(this.graph, name);
		this.root.addNode(node);
		return node;
	}

	/** Creates a new {@link Mesh} attached to this container's {@link Root}. */
	createMesh(name: string): Mesh {
		const mesh = new Mesh(this.graph, name);
		this.root.addMesh(mesh);
		return mesh;
	}

	/**
	 * Creates a new {@link Primitive}. Primitives must be attached to a {@link Mesh}
	 * for use and export; they are not otherwise associated with a {@link Root}.
	 */
	createPrimitive(): Primitive {
		const primitive = new Primitive(this.graph);
		return primitive;
	}

	/** Creates a new {@link Material} attached to this container's {@link Root}. */
	createMaterial(name: string): Material {
		const material = new Material(this.graph, name);
		this.root.addMaterial(material);
		return material;
	}

	/** Creates a new {@link Texture} attached to this container's {@link Root}. */
	createTexture(name: string): Texture {
		const texture = new Texture(this.graph, name);
		this.root.addTexture(texture);
		return texture;
	}

	/** Creates a new {@link Accessor} attached to this container's {@link Root}. */
	createAccessor(name: string, buffer: Buffer): Accessor {
		const accessor = new Accessor(this.graph, name).setBuffer(buffer);
		this.root.addAccessor(accessor);
		return accessor;
	}

	/** Creates a new {@link Buffer} attached to this container's {@link Root}. */
	createBuffer(name: string): Buffer {
		const buffer = new Buffer(this.graph, name);
		this.root.addBuffer(buffer);
		return buffer;
	}
}
