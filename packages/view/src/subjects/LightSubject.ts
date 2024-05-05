import { DirectionalLight, PointLight, SpotLight } from 'three';
import { Light as LightDef } from '@gltf-transform/extensions';
import type { DocumentViewSubjectAPI } from '../DocumentViewImpl.js';
import { Subject } from './Subject.js';
import { ValuePool } from '../pools/index.js';
import { LightLike } from '../constants.js';

/** @internal */
export class LightSubject extends Subject<LightDef, LightLike> {
	constructor(documentView: DocumentViewSubjectAPI, def: LightDef) {
		super(documentView, def, LightSubject.createValue(def, documentView.lightPool), documentView.lightPool);
	}

	private static createValue(def: LightDef, pool: ValuePool<LightLike>): LightLike {
		switch (def.getType()) {
			case LightDef.Type.POINT:
				return pool.requestBase(new PointLight());
			case LightDef.Type.SPOT:
				return pool.requestBase(new SpotLight());
			case LightDef.Type.DIRECTIONAL:
				return pool.requestBase(new DirectionalLight());
			default:
				throw new Error(`Unexpected light type: ${def.getType()}`);
		}
	}

	update() {
		const def = this.def;
		let value = this.value;

		if (getType(def) !== value.type) {
			this.pool.releaseBase(value);
			this.value = value = LightSubject.createValue(def, this.pool);
		}

		value.name = def.getName();
		value.color.fromArray(def.getColor());
		value.intensity = def.getIntensity();
		value.position.set(0, 0, 0); // non-default for SpotLight

		if (value instanceof PointLight) {
			value.distance = def.getRange() || 0;
			value.decay = 2;
		} else if (value instanceof SpotLight) {
			value.distance = def.getRange() || 0;
			value.angle = def.getOuterConeAngle();
			value.penumbra = 1.0 - def.getInnerConeAngle() / def.getOuterConeAngle();
			value.decay = 2;
			value.target.position.set(0, 0, -1);
			value.add(value.target);
		} else if (value instanceof DirectionalLight) {
			value.target.position.set(0, 0, -1);
			value.add(value.target);
		}
	}
}

function getType(def: LightDef): string {
	switch (def.getType()) {
		case LightDef.Type.POINT:
			return 'PointLight';
		case LightDef.Type.SPOT:
			return 'SpotLight';
		case LightDef.Type.DIRECTIONAL:
			return 'DirectionalLight';
		default:
			throw new Error(`Unexpected light type: ${def.getType()}`);
	}
}
