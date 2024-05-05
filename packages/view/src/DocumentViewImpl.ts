import { PropertyType, ExtensionProperty as ExtensionPropertyDef } from '@gltf-transform/core';
import type {
	Accessor as AccessorDef,
	Material as MaterialDef,
	Mesh as MeshDef,
	Node as NodeDef,
	Primitive as PrimitiveDef,
	Property as PropertyDef,
	Scene as SceneDef,
	Skin as SkinDef,
	Texture as TextureDef,
} from '@gltf-transform/core';
import type { Light as LightDef, InstancedMesh as InstancedMeshDef } from '@gltf-transform/extensions';
import type { Object3D, BufferAttribute, Group, Texture, Material, Skeleton, InstancedMesh } from 'three';
import {
	AccessorSubject,
	Subject,
	ExtensionSubject,
	MaterialSubject,
	MeshSubject,
	NodeSubject,
	PrimitiveSubject,
	SceneSubject,
	SkinSubject,
	TextureSubject,
	LightSubject,
	InstancedMeshSubject,
} from './subjects/index.js';
import type { LightLike, MeshLike, THREEObject } from './constants.js';
import { DefaultImageProvider, ImageProvider } from './ImageProvider.js';
import { MaterialPool, SingleUserPool, Pool, TexturePool } from './pools/index.js';

export interface DocumentViewSubjectAPI {
	readonly accessorPool: Pool<BufferAttribute>;
	readonly extensionPool: Pool<ExtensionPropertyDef>;
	readonly instancedMeshPool: Pool<InstancedMesh>;
	readonly lightPool: SingleUserPool<LightLike>;
	readonly materialPool: MaterialPool;
	readonly meshPool: SingleUserPool<Group>;
	readonly nodePool: Pool<Object3D>;
	readonly primitivePool: SingleUserPool<MeshLike>;
	readonly scenePool: Pool<Group>;
	readonly skinPool: Pool<Skeleton>;
	readonly texturePool: TexturePool;

	imageProvider: ImageProvider;

	bind(def: null): null;
	bind(def: AccessorDef): AccessorSubject;
	bind(def: InstancedMeshDef): InstancedMeshSubject;
	bind(def: LightDef): LightSubject;
	bind(def: MaterialDef): MaterialSubject;
	bind(def: MeshDef): MeshSubject;
	bind(def: NodeDef): NodeSubject;
	bind(def: PrimitiveDef): PrimitiveSubject;
	bind(def: SceneDef): SceneSubject;
	bind(def: SkinDef): SkinSubject;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	bind(def: PropertyDef): Subject<PropertyDef, any>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	bind(def: PropertyDef | null): Subject<PropertyDef, any> | null;

	recordOutputValue(def: PropertyDef, value: THREEObject): void;
	recordOutputVariant(base: THREEObject, variant: THREEObject): void;

	isDisposed(): boolean;
}

export interface DocumentViewConfig {
	imageProvider?: ImageProvider;
}

/** @internal */
export class DocumentViewImpl implements DocumentViewSubjectAPI {
	private _disposed = false;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private _subjects = new Map<PropertyDef, Subject<PropertyDef, any>>();
	private _outputValues = new WeakMap<PropertyDef, Set<object>>();
	private _outputValuesInverse = new WeakMap<object, PropertyDef>();

	readonly accessorPool: Pool<BufferAttribute> = new Pool<BufferAttribute>('accessors', this);
	readonly extensionPool: Pool<ExtensionPropertyDef> = new Pool<ExtensionPropertyDef>('extensions', this);
	readonly materialPool: MaterialPool = new MaterialPool('materials', this);
	readonly instancedMeshPool: Pool<InstancedMesh> = new Pool<InstancedMesh>('instancedMeshes', this);
	readonly lightPool: SingleUserPool<LightLike> = new SingleUserPool<LightLike>('lights', this);
	readonly meshPool: SingleUserPool<Group> = new SingleUserPool<Group>('meshes', this);
	readonly nodePool: Pool<Object3D> = new Pool<Object3D>('nodes', this);
	readonly primitivePool: SingleUserPool<MeshLike> = new SingleUserPool<MeshLike>('primitives', this);
	readonly scenePool: Pool<Group> = new Pool<Group>('scenes', this);
	readonly skinPool: Pool<Skeleton> = new Pool<Skeleton>('skins', this);
	readonly texturePool: TexturePool = new TexturePool('textures', this);

	public imageProvider: ImageProvider;

	constructor(config: DocumentViewConfig) {
		this.imageProvider = config.imageProvider || new DefaultImageProvider();
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private _addSubject(subject: Subject<PropertyDef, any>): void {
		const def = subject.def;
		this._subjects.set(def, subject);
		def.addEventListener('dispose', () => {
			this._subjects.delete(def);
		});
	}

	bind(def: null): null;
	bind(def: AccessorDef): AccessorSubject;
	bind(def: InstancedMeshDef): InstancedMeshSubject;
	bind(def: LightDef): LightSubject;
	bind(def: MaterialDef): MaterialSubject;
	bind(def: MeshDef): MeshSubject;
	bind(def: NodeDef): NodeSubject;
	bind(def: PrimitiveDef): PrimitiveSubject;
	bind(def: SceneDef): SceneSubject;
	bind(def: SkinDef): SkinSubject;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	bind(def: PropertyDef): Subject<PropertyDef, any>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	bind(def: PropertyDef | null): Subject<PropertyDef, any> | null {
		if (!def) return null;
		if (this._subjects.has(def)) return this._subjects.get(def)!;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let subject: Subject<PropertyDef, any>;
		switch (def.propertyType) {
			case PropertyType.ACCESSOR:
				subject = new AccessorSubject(this, def as AccessorDef);
				break;
			case 'InstancedMesh':
				subject = new InstancedMeshSubject(this, def as InstancedMeshDef);
				break;
			case 'Light':
				subject = new LightSubject(this, def as LightDef);
				break;
			case PropertyType.MATERIAL:
				subject = new MaterialSubject(this, def as MaterialDef);
				break;
			case PropertyType.MESH:
				subject = new MeshSubject(this, def as MeshDef);
				break;
			case PropertyType.NODE:
				subject = new NodeSubject(this, def as NodeDef);
				break;
			case PropertyType.PRIMITIVE:
				subject = new PrimitiveSubject(this, def as PrimitiveDef);
				break;
			case PropertyType.SCENE:
				subject = new SceneSubject(this, def as SceneDef);
				break;
			case PropertyType.SKIN:
				subject = new SkinSubject(this, def as SkinDef);
				break;
			case PropertyType.TEXTURE:
				subject = new TextureSubject(this, def as TextureDef);
				break;
			default: {
				if (def instanceof ExtensionPropertyDef) {
					subject = new ExtensionSubject(this, def as ExtensionPropertyDef);
				} else {
					throw new Error(`Unimplemented type: ${def.propertyType}`);
				}
			}
		}

		subject.update();
		this._addSubject(subject);
		return subject;
	}

	recordOutputValue(def: PropertyDef, value: THREEObject) {
		const outputValues = this._outputValues.get(def) || new Set();
		outputValues.add(value);
		this._outputValues.set(def, outputValues);
		this._outputValuesInverse.set(value, def);
	}

	recordOutputVariant(base: THREEObject, variant: THREEObject) {
		const def = this._outputValuesInverse.get(base);
		if (def) {
			this.recordOutputValue(def, variant);
		} else {
			console.warn(`Missing definition for output of type "${base.type}}"`);
		}
	}

	stats() {
		return {
			accessors: this.accessorPool.size(),
			extensions: this.extensionPool.size(),
			instancedMeshes: this.instancedMeshPool.size(),
			lights: this.lightPool.size(),
			materials: this.materialPool.size(),
			meshes: this.meshPool.size(),
			nodes: this.nodePool.size(),
			primitives: this.primitivePool.size(),
			scenes: this.scenePool.size(),
			skins: this.skinPool.size(),
			textures: this.texturePool.size(),
		};
	}

	gc() {
		this.accessorPool.gc();
		this.extensionPool.gc();
		this.instancedMeshPool.gc();
		this.lightPool.gc();
		this.materialPool.gc();
		this.meshPool.gc();
		this.nodePool.gc();
		this.primitivePool.gc();
		this.scenePool.gc();
		this.skinPool.gc();
		this.texturePool.gc();
	}

	/**
	 * Given a target object (currently any THREE.Object3D), finds and returns the source
	 * glTF-Transform Property definition.
	 */
	findDef(target: Texture): TextureDef | null;
	findDef(target: LightLike): LightDef | null;
	findDef(target: Material): MaterialDef | null;
	findDef(target: MeshLike): PrimitiveDef | null;
	findDef(target: Object3D): SceneDef | NodeDef | MeshDef | null;
	findDef(target: object): PropertyDef | null {
		return this._outputValuesInverse.get(target) || null;
	}

	/**
	 * Given a source object (currently anything rendered as THREE.Object3D), finds and returns
	 * the list of output THREE.Object3D instances.
	 */
	findValues(def: TextureDef): Texture[];
	findValues(def: LightDef): LightLike[];
	findValues(def: MaterialDef): Material[];
	findValues(def: PrimitiveDef): MeshLike[];
	findValues(def: SceneDef | NodeDef | MeshDef): Object3D[];
	findValues(def: PropertyDef): object[] {
		return Array.from(this._outputValues.get(def) || []);
	}

	isDisposed(): boolean {
		return this._disposed;
	}

	dispose(): void {
		// First, to prevent updates during disposal.
		this._disposed = true;

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		for (const [_, subject] of this._subjects) subject.dispose();
		this._subjects.clear();

		// Last, to clean up anything left after disposal.
		this.accessorPool.dispose();
		this.instancedMeshPool.dispose();
		this.lightPool.dispose();
		this.materialPool.dispose();
		this.meshPool.dispose();
		this.nodePool.dispose();
		this.primitivePool.dispose();
		this.skinPool.dispose();
		this.scenePool.dispose();
		this.texturePool.dispose();
	}
}
