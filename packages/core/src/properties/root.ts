import { PropertyType, VERSION } from '../constants';
import { Extension } from '../extension';
import { GraphChildList, Link } from '../graph/index';
import { Accessor } from './accessor';
import { Animation } from './animation';
import { Buffer } from './buffer';
import { Camera } from './camera';
import { Material } from './material';
import { Mesh } from './mesh';
import { Node } from './node';
import { COPY_IDENTITY, Property } from './property';
import { Scene } from './scene';
import { Skin } from './skin';
import { Texture } from './texture';

/**
 * # Root
 *
 * *Root property of a glTF asset.*
 *
 * Any properties to be exported with a particular asset must be referenced (directly or
 * indirectly) by the root. Metadata about the asset's license, generator, and glTF specification
 * version are stored in the asset, accessible with {@link .getAsset}().
 *
 * Properties are added to the root with factory methods on its {@link Document}, and removed by
 * calling {@link Property.dispose}() on the resource. Any properties that have been created but
 * not disposed will be included when calling the various `root.list*()` methods.
 *
 * A document's root cannot be removed, and no other root may be created. Unlike other
 * {@link Property} types, the `.dispose()`, `.detach()` methods have no useful function on a
 * Root property.
 *
 * Usage:
 *
 * ```ts
 * const root = document.getRoot();
 * const scene = document.createScene('myScene');
 * const node = document.createNode('myNode');
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
	public readonly propertyType = PropertyType.ROOT;

	private readonly _asset: GLTF.IAsset = {
		generator: `glTF-Transform ${VERSION}`,
		version: '2.0'
	};

	private readonly _extensions: Set<Extension> = new Set();

	@GraphChildList private accessors: Link<Root, Accessor>[] = [];
	@GraphChildList private animations: Link<Root, Animation>[] = [];
	@GraphChildList private buffers: Link<Root, Buffer>[] = [];
	@GraphChildList private cameras: Link<Root, Camera>[] = [];
	@GraphChildList private materials: Link<Root, Material>[] = [];
	@GraphChildList private meshes: Link<Root, Mesh>[] = [];
	@GraphChildList private nodes: Link<Root, Node>[] = [];
	@GraphChildList private scenes: Link<Root, Scene>[] = [];
	@GraphChildList private skins: Link<Root, Skin>[] = [];
	@GraphChildList private textures: Link<Root, Texture>[] = [];

	public clone(): this {
		throw new Error('Root cannot be cloned.');
	}

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		// Root cannot be cloned in isolation: only with its Document. Extensions are managed by
		// the Document during cloning.
		if (!resolve) throw new Error('Root cannot be copied.');

		Object.assign(this._asset, other._asset);

		this.clearGraphChildList(this.accessors);
		this.clearGraphChildList(this.animations);
		this.clearGraphChildList(this.buffers);
		this.clearGraphChildList(this.cameras);
		this.clearGraphChildList(this.materials);
		this.clearGraphChildList(this.meshes);
		this.clearGraphChildList(this.nodes);
		this.clearGraphChildList(this.scenes);
		this.clearGraphChildList(this.skins);
		this.clearGraphChildList(this.textures);

		other.accessors.forEach((link) => this._addAccessor(resolve(link.getChild())));
		other.animations.forEach((link) => this._addAnimation(resolve(link.getChild())));
		other.buffers.forEach((link) => this._addBuffer(resolve(link.getChild())));
		other.cameras.forEach((link) => this._addCamera(resolve(link.getChild())));
		other.materials.forEach((link) => this._addMaterial(resolve(link.getChild())));
		other.meshes.forEach((link) => this._addMesh(resolve(link.getChild())));
		other.nodes.forEach((link) => this._addNode(resolve(link.getChild())));
		other.scenes.forEach((link) => this._addScene(resolve(link.getChild())));
		other.skins.forEach((link) => this._addSkin(resolve(link.getChild())));
		other.textures.forEach((link) => this._addTexture(resolve(link.getChild())));

		return this;
	}

	/**
	 * Returns the `asset` object, which specifies the target glTF version of the asset. Additional
	 * metadata can be stored in optional properties such as `generator` or `copyright`.
	 *
	 * Reference: [glTF → Asset](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#asset)
	 */
	public getAsset(): GLTF.IAsset { return this._asset; }

	/**********************************************************************************************
	 * Extensions.
	 */

	/** Lists all {@link Extension} properties enabled for this root. */
	public listExtensionsUsed(): Extension[] {
		return Array.from(this._extensions);
	}

	/** Lists all {@link Extension} properties enabled and required for this root. */
	public listExtensionsRequired(): Extension[] {
		return this.listExtensionsUsed().filter((extension) => extension.isRequired());
	}

	/** @hidden */
	public _enableExtension(extension: Extension): this {
		if (this._extensions.has(extension)) {
			throw new Error(`Extension "${extension.extensionName}" is already enabled.`);
		}
		this._extensions.add(extension);
		return this;
	}

	/** @hidden */
	public _disableExtension(extension: Extension): this {
		this._extensions.delete(extension);
		return this;
	}

	/**********************************************************************************************
	 * Scenes.
	 */

	/**
	 * Adds a new {@link Scene} to the root list.
	 * @hidden
	 */
	public _addScene(scene: Scene): this {
		return this.addGraphChild(this.scenes, this.graph.link('scene', this, scene));
	}

	/** Lists all {@link Scene} properties associated with this root. */
	public listScenes(): Scene[] {
		return this.scenes.map((p) => p.getChild());
	}

	/**********************************************************************************************
	 * Nodes.
	 */

	/**
	 * Adds a new {@link Node} to the root list.
	 * @hidden
	 */
	public _addNode(node: Node): this {
		return this.addGraphChild(this.nodes, this.graph.link('node', this, node));
	}

	/** Lists all {@link Node} properties associated with this root. */
	public listNodes(): Node[] {
		return this.nodes.map((p) => p.getChild());
	}

	/**********************************************************************************************
	 * Cameras.
	 */

	/**
	 * Adds a new {@link Camera} to the root list.
	 * @hidden
	 */
	public _addCamera(camera: Camera): this {
		return this.addGraphChild(this.cameras, this.graph.link('camera', this, camera));
	}

	/** Lists all {@link Camera} properties associated with this root. */
	public listCameras(): Camera[] {
		return this.cameras.map((p) => p.getChild());
	}

	/**********************************************************************************************
	 * Skins.
	 */

	/**
	 * Adds a new {@link Skin} to the root list.
	 * @hidden
	 */
	public _addSkin(skin: Skin): this {
		return this.addGraphChild(this.skins, this.graph.link('skin', this, skin));
	}

	/** Lists all {@link Skin} properties associated with this root. */
	public listSkins(): Skin[] {
		return this.skins.map((p) => p.getChild());
	}

	/**********************************************************************************************
	 * Meshes.
	 */

	/**
	 * Adds a new {@link Mesh} to the root list.
	 * @hidden
	 */
	public _addMesh(mesh: Mesh): this {
		return this.addGraphChild(this.meshes, this.graph.link('mesh', this, mesh));
	}

	/** Lists all {@link Mesh} properties associated with this root. */
	public listMeshes(): Mesh[] {
		return this.meshes.map((p) => p.getChild());
	}

	/**********************************************************************************************
	 * Materials.
	 */

	/**
	 * Adds a new {@link Material} to the root list.
	 * @hidden
	 */
	public _addMaterial(material: Material): this {
		return this.addGraphChild(this.materials, this.graph.link('material', this, material));
	}

	/** Lists all {@link Material} properties associated with this root. */
	public listMaterials(): Material[] {
		return this.materials.map((p) => p.getChild());
	}

	/**********************************************************************************************
	 * Textures.
	 */

	/**
	 * Adds a new {@link Texture} to the root list.
	 * @hidden
	 */
	public _addTexture(texture: Texture): this {
		return this.addGraphChild(this.textures, this.graph.link('texture', this, texture));
	}


	/** Lists all {@link Texture} properties associated with this root. */
	public listTextures(): Texture[] {
		return this.textures.map((p) => p.getChild());
	}

	/**********************************************************************************************
	 * Animations.
	 */

	/**
	 * Adds a new {@link Animation} to the root list.
	 * @hidden
	 */
	public _addAnimation(animation: Animation): this {
		return this.addGraphChild(this.animations, this.graph.link('animation', this, animation));
	}

	/** Lists all {@link Animation} properties associated with this root. */
	public listAnimations(): Animation[] {
		return this.animations.map((p) => p.getChild());
	}


	/**********************************************************************************************
	 * Accessors.
	 */

	/**
	 * Adds a new {@link Accessor} to the root list.
	 * @hidden
	 */
	public _addAccessor(accessor: Accessor): this {
		return this.addGraphChild(this.accessors, this.graph.link('accessor', this, accessor));
	}

	/** Lists all {@link Accessor} properties associated with this root. */
	public listAccessors(): Accessor[] {
		return this.accessors.map((p) => p.getChild());
	}

	/**********************************************************************************************
	 * Buffers.
	 */

	/**
	 * Adds a new {@link Buffer} to the root list.
	 * @hidden
	 */
	public _addBuffer(buffer: Buffer): this {
		return this.addGraphChild(this.buffers, this.graph.link('buffer', this, buffer));
	}

	/** Lists all {@link Buffer} properties associated with this root. */
	public listBuffers(): Buffer[] {
		return this.buffers.map((p) => p.getChild());
	}
}
