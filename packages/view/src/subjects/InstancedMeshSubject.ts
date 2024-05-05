import { BufferAttribute, BufferGeometry, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import { Accessor as AccessorDef } from '@gltf-transform/core';
import type { DocumentViewSubjectAPI } from '../DocumentViewImpl.js';
import { Subject } from './Subject.js';
import { RefMapObserver } from '../observers/index.js';
import { ValuePool } from '../pools/index.js';
import { InstancedMesh as InstancedMeshDef } from '@gltf-transform/extensions';
import { DEFAULT_MATERIAL, semanticToAttributeName } from '../utils/index.js';

const _t = new Vector3();
const _r = new Quaternion();
const _s = new Vector3();
const _matrix = new Matrix4();

/** @internal */
export class InstancedMeshSubject extends Subject<InstancedMeshDef, InstancedMesh> {
	protected attributes = new RefMapObserver<AccessorDef, BufferAttribute>('attributes', this._documentView);

	constructor(documentView: DocumentViewSubjectAPI, def: InstancedMeshDef) {
		super(
			documentView,
			def,
			InstancedMeshSubject.createValue(getCount({}), documentView.instancedMeshPool),
			documentView.instancedMeshPool,
		);

		this.attributes.subscribe((nextAttributes) => {
			let value = this.value;
			if (value) this.pool.releaseBase(value);

			value = InstancedMeshSubject.createValue(getCount(nextAttributes), documentView.instancedMeshPool);

			let translation: BufferAttribute | null = null;
			let rotation: BufferAttribute | null = null;
			let scale: BufferAttribute | null = null;

			for (const key in nextAttributes) {
				if (key === 'TRANSLATION') {
					translation = nextAttributes[key];
				} else if (key === 'ROTATION') {
					rotation = nextAttributes[key];
				} else if (key === 'SCALE') {
					scale = nextAttributes[key];
				} else {
					value.geometry.setAttribute(semanticToAttributeName(key), nextAttributes[key]);
				}
			}

			_t.set(0, 0, 0);
			_r.set(0, 0, 0, 1);
			_s.set(1, 1, 1);

			for (let i = 0; i < value.count; i++) {
				if (translation) _t.fromBufferAttribute(translation, i);
				if (rotation) _r.fromBufferAttribute(rotation, i);
				if (scale) _s.fromBufferAttribute(scale, i);
				_matrix.compose(_t, _r, _s);
				value.setMatrixAt(i, _matrix);
			}

			this.value = value;

			this.publishAll();
		});
	}

	update() {
		const def = this.def;

		this.attributes.update(def.listSemantics(), def.listAttributes());
	}

	private static createValue(count: number, pool: ValuePool<InstancedMesh>): InstancedMesh {
		return pool.requestBase(new InstancedMesh(new BufferGeometry(), DEFAULT_MATERIAL, count));
	}

	dispose() {
		this.value.geometry.dispose();
		this.attributes.dispose();
		super.dispose();
	}
}

function getCount(attributes: Record<string, BufferAttribute>): number {
	for (const key in attributes) {
		return attributes[key].count;
	}
	return 1;
}
