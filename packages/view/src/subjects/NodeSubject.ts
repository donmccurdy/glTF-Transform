import { Bone, Group, Matrix4, Object3D, Skeleton, SkinnedMesh, InstancedMesh, Mesh } from 'three';
import { Mesh as MeshDef, Node as NodeDef, Skin as SkinDef, vec3, vec4 } from '@gltf-transform/core';
import { Light as LightDef, InstancedMesh as InstancedMeshDef } from '@gltf-transform/extensions';
import type { DocumentViewSubjectAPI } from '../DocumentViewImpl.js';
import { eq } from '../utils/index.js';
import { Subject } from './Subject.js';
import { RefListObserver, RefObserver } from '../observers/index.js';
import { SingleUserPool } from '../pools/index.js';
import { LightLike } from '../constants.js';

const _vec3: vec3 = [0, 0, 0];
const _vec4: vec4 = [0, 0, 0, 0];
const IDENTITY = new Matrix4().identity();

/** @internal */
export class NodeSubject extends Subject<NodeDef, Object3D> {
	protected children = new RefListObserver<NodeDef, Object3D>('children', this._documentView);
	protected mesh = new RefObserver<MeshDef, Group>('mesh', this._documentView).setParamsFn(() =>
		SingleUserPool.createParams(this.def),
	);
	protected skin = new RefObserver<SkinDef, Skeleton>('skin', this._documentView);
	protected light = new RefObserver<LightDef, LightLike>('light', this._documentView);
	protected instancedMesh = new RefObserver<InstancedMeshDef, InstancedMesh>('instancedMesh', this._documentView);

	/** Output (Object3D) is never cloned by an observer. */
	protected _outputSingleton = true;

	constructor(documentView: DocumentViewSubjectAPI, def: NodeDef) {
		super(
			documentView,
			def,
			documentView.nodePool.requestBase(isJoint(def) ? new Bone() : new Object3D()),
			documentView.nodePool,
		);

		this.children.subscribe((nextChildren, prevChildren) => {
			if (prevChildren.length) this.value.remove(...prevChildren);
			if (nextChildren.length) this.value.add(...nextChildren);
			this.publishAll();
		});
		this.mesh.subscribe(() => {
			this.detachMesh();
			this.attachMesh();
			this.bindSkeleton();
			this.publishAll();
		});
		this.skin.subscribe(() => {
			this.bindSkeleton();
			this.publishAll();
		});
		this.light.subscribe((nextLight, prevLight) => {
			if (prevLight) this.value.remove(prevLight);
			if (nextLight) this.value.add(nextLight);
			this.publishAll();
		});
		this.instancedMesh.subscribe(() => {
			this.detachMesh();
			this.attachMesh();
			this.publishAll();
		});
	}

	private detachMesh() {
		let group: Group | undefined;
		for (const child of this.value.children) {
			if ((child as Group).isGroup) {
				group = child as Group;
				break;
			}
		}
		if (group) this.value.remove(group);
	}

	private attachMesh() {
		const srcGroup = this.mesh.value;
		const srcInstancedMesh = this.instancedMesh.value;
		if (srcGroup && srcInstancedMesh) {
			const dstGroup = new Group();
			for (const mesh of srcGroup.children as Mesh[]) {
				const instancedMesh = new InstancedMesh(mesh.geometry, mesh.material, srcInstancedMesh.count);
				instancedMesh.instanceMatrix.copy(srcInstancedMesh.instanceMatrix);
				dstGroup.add(instancedMesh);
			}
			this.value.add(dstGroup);
		} else if (srcGroup) {
			this.value.add(srcGroup);
		}
	}

	private bindSkeleton() {
		if (!this.mesh.value || !this.skin.value) return;

		for (const prim of this.mesh.value.children) {
			if (prim instanceof SkinnedMesh) {
				prim.bind(this.skin.value, IDENTITY);
				prim.normalizeSkinWeights(); // three.js#15319
			}
		}
	}

	update() {
		const def = this.def;
		const value = this.value;

		if (def.getName() !== value.name) {
			value.name = def.getName();
		}

		if (!eq(def.getTranslation(), value.position.toArray(_vec3))) {
			value.position.fromArray(def.getTranslation());
		}

		if (!eq(def.getRotation(), value.quaternion.toArray(_vec4))) {
			value.quaternion.fromArray(def.getRotation());
		}

		if (!eq(def.getScale(), value.scale.toArray(_vec3))) {
			value.scale.fromArray(def.getScale());
		}

		this.children.update(def.listChildren());
		this.mesh.update(def.getMesh());
		this.skin.update(def.getSkin());
		this.light.update(def.getExtension('KHR_lights_punctual'));
		this.instancedMesh.update(def.getExtension('EXT_mesh_gpu_instancing'));
	}

	dispose() {
		this.children.dispose();
		this.mesh.dispose();
		this.skin.dispose();
		this.light.dispose();
		this.instancedMesh.dispose();
		super.dispose();
	}
}

function isJoint(def: NodeDef): boolean {
	return def.listParents().some((parent) => parent instanceof SkinDef);
}
