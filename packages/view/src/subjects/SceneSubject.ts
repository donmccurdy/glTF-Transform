import { Group, Object3D } from 'three';
import type { Node as NodeDef, Scene as SceneDef } from '@gltf-transform/core';
import type { DocumentViewSubjectAPI } from '../DocumentViewImpl.js';
import { Subject } from './Subject.js';
import { RefListObserver } from '../observers/index.js';

/** @internal */
export class SceneSubject extends Subject<SceneDef, Group> {
	protected children = new RefListObserver<NodeDef, Object3D>('children', this._documentView);

	constructor(documentView: DocumentViewSubjectAPI, def: SceneDef) {
		super(documentView, def, documentView.scenePool.requestBase(new Group()), documentView.scenePool);
		this.children.subscribe((nextChildren, prevChildren) => {
			if (prevChildren.length) this.value.remove(...prevChildren);
			if (nextChildren.length) this.value.add(...nextChildren);
			this.publishAll();
		});
	}

	update() {
		const def = this.def;
		const target = this.value;

		if (def.getName() !== target.name) {
			target.name = def.getName();
		}

		this.children.update(def.listChildren());
	}

	dispose() {
		this.children.dispose();
		super.dispose();
	}
}
