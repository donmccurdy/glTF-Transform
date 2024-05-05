import { Group } from 'three';
import { Mesh as MeshDef, Primitive as PrimitiveDef } from '@gltf-transform/core';
import type { DocumentViewSubjectAPI } from '../DocumentViewImpl.js';
import { Subject } from './Subject.js';
import { RefListObserver } from '../observers/index.js';
import { MeshLike } from '../constants.js';
import { SingleUserParams, SingleUserPool } from '../pools/index.js';

/** @internal */
export class MeshSubject extends Subject<MeshDef, Group> {
	protected primitives = new RefListObserver<PrimitiveDef, MeshLike, SingleUserParams>(
		'primitives',
		this._documentView,
	).setParamsFn(() => SingleUserPool.createParams(this.def));

	constructor(documentView: DocumentViewSubjectAPI, def: MeshDef) {
		super(documentView, def, documentView.meshPool.requestBase(new Group()), documentView.meshPool);

		this.primitives.subscribe((nextPrims, prevPrims) => {
			if (prevPrims.length) this.value.remove(...prevPrims);
			if (nextPrims.length) this.value.add(...nextPrims);
			this.publishAll();
		});
	}

	update() {
		const def = this.def;
		const value = this.value;

		if (def.getName() !== value.name) {
			value.name = def.getName();
		}

		this.primitives.update(def.listPrimitives());
	}

	dispose() {
		this.primitives.dispose();
		super.dispose();
	}
}
