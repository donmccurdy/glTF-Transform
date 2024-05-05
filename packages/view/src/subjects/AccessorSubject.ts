import { BufferAttribute } from 'three';
import { Accessor as AccessorDef } from '@gltf-transform/core';
import type { DocumentViewImpl } from '../DocumentViewImpl.js';
import { Subject } from './Subject.js';
import { ValuePool } from '../pools/index.js';

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
		return pool.requestBase(new BufferAttribute(def.getArray()!, def.getElementSize(), def.getNormalized()));
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
