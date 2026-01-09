import type { Accessor as AccessorDef } from '@gltf-transform/core';
import { BufferAttribute, type TypedArray } from 'three';
import type { DocumentViewImpl } from '../DocumentViewImpl.js';
import type { ValuePool } from '../pools/index.js';
import { Subject } from './Subject.js';

/** @internal */
export class AccessorSubject extends Subject<AccessorDef, BufferAttribute> {
	constructor(documentView: DocumentViewImpl, def: AccessorDef) {
		super(
			documentView,
			def,
			AccessorSubject.createValue(def, documentView.accessorPool),
			documentView.accessorPool,
		);
	}

	private static createValue(def: AccessorDef, pool: ValuePool<BufferAttribute>) {
		const array = def.getArray() as TypedArray;
		return pool.requestBase(new BufferAttribute(array, def.getElementSize(), def.getNormalized()));
	}

	update() {
		const def = this.def;
		const value = this.value;

		if (
			def.getArray() !== value.array ||
			def.getElementSize() !== value.itemSize ||
			def.getNormalized() !== value.normalized
		) {
			this.pool.releaseBase(value);
			this.value = AccessorSubject.createValue(def, this.pool);
		} else {
			value.needsUpdate = true;
		}
	}
}
