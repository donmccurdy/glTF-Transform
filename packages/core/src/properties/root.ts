import { NOT_IMPLEMENTED, VERSION } from '../constants';
import { GraphChildList, Link } from '../graph/index';
import { Accessor } from './accessor';
import { Buffer } from './buffer';
import { Material } from './material';
import { Mesh } from './mesh';
import { Node } from './node';
import { Property } from './property';
import { Scene } from './scene';
import { Texture } from './texture';

/**
 * Root property of a glTF asset.
 *
 * Any properties to be exported with a particular asset must be referenced (directly or
 * indirectly) by the root. Metadata about the asset's license, generator, and glTF specification
 * version are stored in the asset, accessible with {@link .getAsset}().
 *
 * Properties are added to the root with factory methods on its {@link Container}, and removed by
 * calling {@link Property.dispose}() on the resource. Any properties that have been created but
 * not disposed will be included when calling the various `root.list*()` methods.
 *
 * A container's root cannot be removed, and no other root may be created.
 *
 * Usage:
 *
 * ```ts
 * const root = container.getRoot();
 * const scene = container.createScene('myScene');
 * const node = container.createNode('myNode');
 * scene.addNode(node);
 *
 * console.log(root.listScenes()); // → [scene x 1]
 * ```
 *
 * Reference: [glTF → Concepts](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#concepts)
 *
 * @category Properties
 */
export class Root extends Property {
	private readonly asset: GLTF.IAsset = {
		generator: `glTF-Transform ${VERSION}`,
		version: '2.0'
	};

	@GraphChildList private scenes: Link<Root, Scene>[] = [];
	@GraphChildList private nodes: Link<Root, Node>[] = [];
	@GraphChildList private meshes: Link<Root, Mesh>[] = [];
	@GraphChildList private materials: Link<Root, Material>[] = [];
	@GraphChildList private textures: Link<Root, Texture>[] = [];
	@GraphChildList private accessors: Link<Root, Accessor>[] = [];
	@GraphChildList private buffers: Link<Root, Buffer>[] = [];

	/** @hidden */
	public dispose(): void {
		throw NOT_IMPLEMENTED;
	}

	/** @hidden */
	public detach(): Root {
		throw NOT_IMPLEMENTED;
	}

	/** @hidden */
	public isDisposed(): false { return false; }

	/**
	 * Returns the `asset` object, which specifies the target glTF version of the asset. Additional
	 * metadata can be stored in optional properties such as `generator` or `copyright`.
	 *
	 * Reference: [glTF → Asset](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#asset)
	 */
	public getAsset(): GLTF.IAsset { return this.asset; }

	/**
	 * Adds a new {@link Scene} to the root list.
	 * @hidden
	 */
	public addScene(scene: Scene): Root {
		return this.addGraphChild(this.scenes, this.graph.link('scene', this, scene) as Link<Root, Scene>) as Root;
	}

	/**
	 * Removes a {@link Scene} from the root list.
	 * @hidden
	 */
	public removeScene(scene: Scene): Root {
		return this.removeGraphChild(this.scenes, scene) as Root;
	}

	/** Lists all {@link Scene} properties associated with this root. */
	public listScenes(): Scene[] {
		return this.scenes.map((p) => p.getChild());
	}

	/**
	 * Adds a new {@link Node} to the root list.
	 * @hidden
	 */
	public addNode(node: Node): Root {
		return this.addGraphChild(this.nodes, this.graph.link('node', this, node) as Link<Root, Node>) as Root;
	}

	/**
	 * Removes a {@link Node} from the root list.
	 * @hidden
	 */
	public removeNode(node: Node): Root {
		return this.removeGraphChild(this.nodes, node) as Root;
	}

	/** Lists all {@link Node} properties associated with this root. */
	public listNodes(): Node[] {
		return this.nodes.map((p) => p.getChild());
	}

	/**
	 * Adds a new {@link Mesh} to the root list.
	 * @hidden
	 */
	public addMesh(mesh: Mesh): Root {
		return this.addGraphChild(this.meshes, this.graph.link('mesh', this, mesh) as Link<Root, Mesh>) as Root;
	}

	/**
	 * Removes a {@link Mesh} from the root list.
	 * @hidden
	 */
	public removeMesh(mesh: Mesh): Root {
		return this.removeGraphChild(this.meshes, mesh) as Root;
	}

	/** Lists all {@link Mesh} properties associated with this root. */
	public listMeshes(): Mesh[] {
		return this.meshes.map((p) => p.getChild());
	}

	/**
	 * Adds a new {@link Material} to the root list.
	 * @hidden
	 */
	public addMaterial(material: Material): Root {
		return this.addGraphChild(this.materials, this.graph.link('material', this, material) as Link<Root, Material>) as Root;
	}

	/**
	 * Removes a {@link Material} from the root list.
	 * @hidden
	 */
	public removeMaterial(material: Material): Root {
		return this.removeGraphChild(this.materials, material) as Root;
	}

	/** Lists all {@link Material} properties associated with this root. */
	public listMaterials(): Material[] {
		return this.materials.map((p) => p.getChild());
	}

	/**
	 * Adds a new {@link Texture} to the root list.
	 * @hidden
	 */
	public addTexture(texture: Texture): Root {
		return this.addGraphChild(this.textures, this.graph.link('texture', this, texture) as Link<Root, Texture>) as Root;
	}

	/**
	 * Removes a {@link Texture} from the root list.
	 * @hidden
	 */
	public removeTexture(texture: Texture): Root {
		return this.removeGraphChild(this.textures, texture) as Root;
	}

	/** Lists all {@link Texture} properties associated with this root. */
	public listTextures(): Texture[] {
		return this.textures.map((p) => p.getChild());
	}

	/**
	 * Adds a new {@link Accessor} to the root list.
	 * @hidden
	 */
	public addAccessor(accessor: Accessor): Root {
		return this.addGraphChild(this.accessors, this.graph.link('accessor', this, accessor) as Link<Root, Accessor>) as Root;
	}

	/**
	 * Removes an {@link Accessor} from the root list.
	 * @hidden
	 */
	public removeAccessor(accessor: Accessor): Root {
		return this.removeGraphChild(this.accessors, accessor) as Root;
	}

	/** Lists all {@link Accessor} properties associated with this root. */
	public listAccessors(): Accessor[] {
		return this.accessors.map((p) => p.getChild());
	}

	/**
	 * Adds a new {@link Buffer} to the root list.
	 * @hidden
	 */
	public addBuffer(buffer: Buffer): Root {
		return this.addGraphChild(this.buffers, this.graph.link('buffer', this, buffer) as Link<Root, Buffer>) as Root;
	}

	/**
	 * Removes a {@link Buffer} from the root list.
	 * @hidden
	 */
	public removeBuffer(buffer: Buffer): Root {
		return this.removeGraphChild(this.buffers, buffer) as Root;
	}

	/** Lists all {@link Buffer} properties associated with this root. */
	public listBuffers(): Buffer[] {
		return this.buffers.map((p) => p.getChild());
	}
}
