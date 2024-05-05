import {
	BufferAttribute,
	BufferGeometry,
	Line,
	LineLoop,
	LineSegments,
	Material,
	Mesh,
	Points,
	SkinnedMesh,
} from 'three';
import { Accessor as AccessorDef, Material as MaterialDef, Primitive as PrimitiveDef } from '@gltf-transform/core';
import type { DocumentViewSubjectAPI } from '../DocumentViewImpl.js';
import { Subject } from './Subject.js';
import { RefMapObserver, RefObserver } from '../observers/index.js';
import { MeshLike } from '../constants.js';
import { MaterialParams, MaterialPool, ValuePool } from '../pools/index.js';
import { DEFAULT_MATERIAL, semanticToAttributeName } from '../utils/index.js';

/** @internal */
export class PrimitiveSubject extends Subject<PrimitiveDef, MeshLike> {
	protected material = new RefObserver<MaterialDef, Material, MaterialParams>(
		'material',
		this._documentView,
	).setParamsFn(() => MaterialPool.createParams(this.def));
	protected indices = new RefObserver<AccessorDef, BufferAttribute>('indices', this._documentView);
	protected attributes = new RefMapObserver<AccessorDef, BufferAttribute>('attributes', this._documentView);

	constructor(documentView: DocumentViewSubjectAPI, def: PrimitiveDef) {
		super(
			documentView,
			def,
			PrimitiveSubject.createValue(def, new BufferGeometry(), DEFAULT_MATERIAL, documentView.primitivePool),
			documentView.primitivePool,
		);

		this.material.subscribe((material) => {
			if (this.value.material !== material) {
				this.value.material = material || DEFAULT_MATERIAL;
				this.publishAll();
			}
		});
		this.indices.subscribe((index) => {
			if (this.value.geometry.index !== index) {
				this.value.geometry.setIndex(index);
				this.publishAll();
			}
		});
		this.attributes.subscribe((nextAttributes, prevAttributes) => {
			const geometry = this.value.geometry;
			for (const key in prevAttributes) {
				geometry.deleteAttribute(semanticToAttributeName(key));
			}
			for (const key in nextAttributes) {
				geometry.setAttribute(semanticToAttributeName(key), nextAttributes[key]);
			}
			this.publishAll();
		});
	}

	update() {
		const def = this.def;
		let value = this.value;

		if (def.getName() !== value.name) {
			value.name = def.getName();
		}

		// Order is important here:
		//  (1) Attributes must update before material params.
		//  (2) Material params must update before material.
		//  (3) Mode can safely come last, but that's non-obvious.

		this.indices.update(def.getIndices());
		this.attributes.update(def.listSemantics(), def.listAttributes());
		this.material.update(def.getMaterial());

		if (getType(def) !== value.type) {
			this.pool.releaseBase(value);
			this.value = value = PrimitiveSubject.createValue(def, value.geometry, value.material, this.pool);
			this.material.invalidate();
		}
	}

	private static createValue(
		def: PrimitiveDef,
		geometry: BufferGeometry,
		material: Material,
		pool: ValuePool<MeshLike>,
	): MeshLike {
		switch (def.getMode()) {
			case PrimitiveDef.Mode.TRIANGLES:
			case PrimitiveDef.Mode.TRIANGLE_FAN:
			case PrimitiveDef.Mode.TRIANGLE_STRIP: {
				// TODO(feat): Support triangle fan and triangle strip.
				if (geometry.hasAttribute('skinIndex')) {
					return pool.requestBase(new SkinnedMesh(geometry, material));
				} else {
					return pool.requestBase(new Mesh(geometry, material));
				}
			}
			case PrimitiveDef.Mode.LINES:
				return pool.requestBase(new LineSegments(geometry, material));
			case PrimitiveDef.Mode.LINE_LOOP:
				return pool.requestBase(new LineLoop(geometry, material));
			case PrimitiveDef.Mode.LINE_STRIP:
				return pool.requestBase(new Line(geometry, material));
			case PrimitiveDef.Mode.POINTS:
				return pool.requestBase(new Points(geometry, material));
			default:
				throw new Error(`Unexpected primitive mode: ${def.getMode()}`);
		}
	}

	dispose() {
		this.value.geometry.dispose();
		this.material.dispose();
		this.indices.dispose();
		this.attributes.dispose();
		super.dispose();
	}
}

/** Returns equivalent GL mode enum for the given THREE.Object3D type. */
// function getObject3DMode(mesh: MeshLike): GLTF.MeshPrimitiveMode {
// 	switch (mesh.type) {
// 		case 'Mesh':
// 		case 'SkinnedMesh':
// 			// TODO(feat): Support triangle fan and triangle strip.
// 			return PrimitiveDef.Mode.TRIANGLES;
// 		case 'LineSegments':
// 			return PrimitiveDef.Mode.LINES;
// 		case 'LineLoop':
// 			return PrimitiveDef.Mode.LINE_LOOP;
// 		case 'Line':
// 			return PrimitiveDef.Mode.LINE_STRIP;
// 		case 'Points':
// 			return PrimitiveDef.Mode.POINTS;
// 		default:
// 			throw new Error(`Unexpected type: ${mesh.type}`);
// 	}
// }

function getType(def: PrimitiveDef): string {
	switch (def.getMode()) {
		case PrimitiveDef.Mode.TRIANGLES:
		case PrimitiveDef.Mode.TRIANGLE_FAN:
		case PrimitiveDef.Mode.TRIANGLE_STRIP: {
			if (def.getAttribute('JOINTS_0')) {
				return 'SkinnedMesh';
			} else {
				return 'Mesh';
			}
		}
		case PrimitiveDef.Mode.LINES:
			return 'LineSegments';
		case PrimitiveDef.Mode.LINE_LOOP:
			return 'LineLoop';
		case PrimitiveDef.Mode.LINE_STRIP:
			return 'Line';
		case PrimitiveDef.Mode.POINTS:
			return 'Points';
		default:
			throw new Error(`Unexpected primitive mode: ${def.getMode()}`);
	}
}
