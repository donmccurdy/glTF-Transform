import { Property as PropertyDef, Mesh as MeshDef, Node as NodeDef, uuid } from '@gltf-transform/core';
import { Object3D } from 'three';
import { LightLike } from '../constants.js';
import { Pool } from './Pool.js';

export interface SingleUserParams {
	id: string;
}

/** @internal */
export class SingleUserPool<T extends Object3D> extends Pool<T, SingleUserParams> {
	private static _parentIDs = new WeakMap<PropertyDef, string>();

	/** Generates a unique Object3D for every parent. */
	static createParams(property: MeshDef | NodeDef): SingleUserParams {
		const id = this._parentIDs.get(property) || uuid();
		this._parentIDs.set(property, id);
		return { id };
	}

	requestVariant(base: T, params: SingleUserParams): T {
		return this._request(this._createVariant(base, params));
	}

	protected _createVariant(srcObject: T, _params: SingleUserParams): T {
		// With a deep clone of a NodeDef or MeshDef value, we're cloning
		// any PrimitiveDef values (e.g. Mesh, Lines, Points) within it.
		// Record the new outputs.
		const dstObject = srcObject.clone();
		parallelTraverse(srcObject, dstObject, (base, variant) => {
			if (base === srcObject) return; // Skip root; recorded elsewhere.
			if ((srcObject as unknown as LightLike).isLight) return; // Skip light target.
			this.documentView.recordOutputVariant(base, variant);
		});
		return dstObject;
	}

	protected _updateVariant(_srcObject: T, _dstObject: T): T {
		throw new Error('Not implemented');
	}
}

function parallelTraverse(a: Object3D, b: Object3D, callback: (a: Object3D, b: Object3D) => void) {
	callback(a, b);
	for (let i = 0; i < a.children.length; i++) {
		parallelTraverse(a.children[i], b.children[i], callback);
	}
}
