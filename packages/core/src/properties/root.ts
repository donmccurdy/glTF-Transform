import { Nullable, PropertyType, VERSION } from '../constants.js';
import type { Extension } from '../extension.js';
import type { Graph } from 'property-graph';
import { RefSet } from 'property-graph';
import { Accessor } from './accessor.js';
import { Animation } from './animation.js';
import { Buffer } from './buffer.js';
import { Camera } from './camera.js';
import { Material } from './material.js';
import { Mesh } from './mesh.js';
import { Node } from './node.js';
import { COPY_IDENTITY, Property } from './property.js';
import { Scene } from './scene.js';
import { Skin } from './skin.js';
import { Texture } from './texture.js';
import { ExtensibleProperty, IExtensibleProperty } from './extensible-property.js';
import type { ExtensionProperty } from './extension-property.js';

interface IAsset {
	version: string;
	minVersion?: string;
	generator?: string;
	copyright?: string;
	[key: string]: unknown;
}

interface IRoot extends IExtensibleProperty {
	asset: IAsset;
	defaultScene: Scene;

	accessors: RefSet<Accessor>;
	animations: RefSet<Animation>;
	buffers: RefSet<Buffer>;
	cameras: RefSet<Camera>;
	materials: RefSet<Material>;
	meshes: RefSet<Mesh>;
	nodes: RefSet<Node>;
	scenes: RefSet<Scene>;
	skins: RefSet<Skin>;
	textures: RefSet<Texture>;
}

/**
 * *Root property of a glTF asset.*
 *
 * Any properties to be exported with a particular asset must be referenced (directly or
 * indirectly) by the root. Metadata about the asset's license, generator, and glTF specification
 * version are stored in the asset, accessible with {@link Root.getAsset}.
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
 * scene.addChild(node);
 *
 * console.log(root.listScenes()); // → [scene x 1]
 * ```
 *
 * Reference: [glTF → Concepts](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#concepts)
 *
 * @category Properties
 */
export class Root extends ExtensibleProperty<IRoot> {
	public declare propertyType: PropertyType.ROOT;

	private readonly _extensions: Set<Extension> = new Set();

	protected init(): void {
		this.propertyType = PropertyType.ROOT;
	}

	protected getDefaults(): Nullable<IRoot> {
		return Object.assign(super.getDefaults() as IExtensibleProperty, {
			asset: {
				generator: `glTF-Transform ${VERSION}`,
				version: '2.0',
			},
			defaultScene: null,
			accessors: new RefSet<Accessor>(),
			animations: new RefSet<Animation>(),
			buffers: new RefSet<Buffer>(),
			cameras: new RefSet<Camera>(),
			materials: new RefSet<Material>(),
			meshes: new RefSet<Mesh>(),
			nodes: new RefSet<Node>(),
			scenes: new RefSet<Scene>(),
			skins: new RefSet<Skin>(),
			textures: new RefSet<Texture>(),
		});
	}

	/** @internal */
	constructor(graph: Graph<Property>) {
		super(graph);
		graph.addEventListener('node:create', (event) => {
			this._addChildOfRoot(event.target as Property);
		});
	}

	public clone(): this {
		throw new Error('Root cannot be cloned.');
	}

	public copy(other: this, resolve = COPY_IDENTITY): this {
		// Root cannot be cloned in isolation: only with its Document. Extensions are managed by
		// the Document during cloning. The Root, and only the Root, should keep existing
		// references while copying to avoid overwriting during a merge.
		if (resolve === COPY_IDENTITY) throw new Error('Root cannot be copied.');

		// IMPORTANT: Root cannot call super.copy(), which removes existing references.

		this.set('asset', { ...other.get('asset') });
		this.setName(other.getName());
		this.setExtras({ ...other.getExtras() });
		this.setDefaultScene(other.getDefaultScene() ? resolve(other.getDefaultScene()!) : null);

		for (const extensionName of other.listRefMapKeys('extensions')) {
			const otherExtension = other.getExtension(extensionName) as ExtensionProperty;
			this.setExtension(extensionName, resolve(otherExtension));
		}

		return this;
	}

	private _addChildOfRoot(child: Property): this {
		if (child instanceof Scene) {
			this.addRef('scenes', child);
		} else if (child instanceof Node) {
			this.addRef('nodes', child);
		} else if (child instanceof Camera) {
			this.addRef('cameras', child);
		} else if (child instanceof Skin) {
			this.addRef('skins', child);
		} else if (child instanceof Mesh) {
			this.addRef('meshes', child);
		} else if (child instanceof Material) {
			this.addRef('materials', child);
		} else if (child instanceof Texture) {
			this.addRef('textures', child);
		} else if (child instanceof Animation) {
			this.addRef('animations', child);
		} else if (child instanceof Accessor) {
			this.addRef('accessors', child);
		} else if (child instanceof Buffer) {
			this.addRef('buffers', child);
		}
		// No error for untracked property types.
		return this;
	}

	/**
	 * Returns the `asset` object, which specifies the target glTF version of the asset. Additional
	 * metadata can be stored in optional properties such as `generator` or `copyright`.
	 *
	 * Reference: [glTF → Asset](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#asset)
	 */
	public getAsset(): IAsset {
		return this.get('asset');
	}

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

	/** @internal */
	public _enableExtension(extension: Extension): this {
		this._extensions.add(extension);
		return this;
	}

	/** @internal */
	public _disableExtension(extension: Extension): this {
		this._extensions.delete(extension);
		return this;
	}

	/**********************************************************************************************
	 * Properties.
	 */

	/** Lists all {@link Scene} properties associated with this root. */
	public listScenes(): Scene[] {
		return this.listRefs('scenes');
	}

	/** Default {@link Scene} associated with this root. */
	public setDefaultScene(defaultScene: Scene | null): this {
		return this.setRef('defaultScene', defaultScene);
	}

	/** Default {@link Scene} associated with this root. */
	public getDefaultScene(): Scene | null {
		return this.getRef('defaultScene');
	}

	/** Lists all {@link Node} properties associated with this root. */
	public listNodes(): Node[] {
		return this.listRefs('nodes');
	}

	/** Lists all {@link Camera} properties associated with this root. */
	public listCameras(): Camera[] {
		return this.listRefs('cameras');
	}

	/** Lists all {@link Skin} properties associated with this root. */
	public listSkins(): Skin[] {
		return this.listRefs('skins');
	}

	/** Lists all {@link Mesh} properties associated with this root. */
	public listMeshes(): Mesh[] {
		return this.listRefs('meshes');
	}

	/** Lists all {@link Material} properties associated with this root. */
	public listMaterials(): Material[] {
		return this.listRefs('materials');
	}

	/** Lists all {@link Texture} properties associated with this root. */
	public listTextures(): Texture[] {
		return this.listRefs('textures');
	}

	/** Lists all {@link Animation} properties associated with this root. */
	public listAnimations(): Animation[] {
		return this.listRefs('animations');
	}

	/** Lists all {@link Accessor} properties associated with this root. */
	public listAccessors(): Accessor[] {
		return this.listRefs('accessors');
	}

	/** Lists all {@link Buffer} properties associated with this root. */
	public listBuffers(): Buffer[] {
		return this.listRefs('buffers');
	}
}
