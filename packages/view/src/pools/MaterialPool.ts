import { GLTF, Primitive as PrimitiveDef } from '@gltf-transform/core';
import {
	LineBasicMaterial,
	Material,
	MeshBasicMaterial,
	MeshPhysicalMaterial,
	MeshStandardMaterial,
	PointsMaterial,
} from 'three';
import { Pool } from './Pool.js';

export type BaseMaterial = MeshBasicMaterial | MeshStandardMaterial | MeshPhysicalMaterial;
export type VariantMaterial =
	| MeshBasicMaterial
	| MeshStandardMaterial
	| MeshPhysicalMaterial
	| LineBasicMaterial
	| PointsMaterial;

export interface MaterialParams {
	mode: GLTF.MeshPrimitiveMode;
	useVertexTangents: boolean;
	useVertexColors: boolean;
	useMorphTargets: boolean;
	useFlatShading: boolean;
}

/** @internal */
export class MaterialPool extends Pool<Material, MaterialParams> {
	static createParams(primitive: PrimitiveDef): MaterialParams {
		return {
			mode: primitive.getMode(),
			useVertexTangents: !!primitive.getAttribute('TANGENT'),
			useVertexColors: !!primitive.getAttribute('COLOR_0'),
			useFlatShading: !primitive.getAttribute('NORMAL'),
			useMorphTargets: primitive.listTargets().length > 0,
		};
	}

	requestVariant(srcMaterial: Material, params: MaterialParams): Material {
		return this._request(this._createVariant(srcMaterial as BaseMaterial, params));
	}

	protected _disposeValue(value: Material): void {
		value.dispose();
		super._disposeValue(value);
	}

	/** Creates a variant material for given source material and MaterialParams. */
	protected _createVariant(srcMaterial: BaseMaterial, params: MaterialParams): VariantMaterial {
		switch (params.mode) {
			case PrimitiveDef.Mode.TRIANGLES:
			case PrimitiveDef.Mode.TRIANGLE_FAN:
			case PrimitiveDef.Mode.TRIANGLE_STRIP:
				return this._updateVariant(srcMaterial, srcMaterial.clone(), params);
			case PrimitiveDef.Mode.LINES:
			case PrimitiveDef.Mode.LINE_LOOP:
			case PrimitiveDef.Mode.LINE_STRIP:
				return this._updateVariant(srcMaterial, new LineBasicMaterial(), params);
			case PrimitiveDef.Mode.POINTS:
				return this._updateVariant(srcMaterial, new PointsMaterial(), params);
			default:
				throw new Error(`Unexpected primitive mode: ${params.mode}`);
		}
	}

	/**
	 * Updates a variant material to match new changes to the source material.
	 *
	 * NOTICE: Changes to MaterialParams should _NOT_ be applied with this method.
	 * Instead, create a new variant and dispose the old if unused.
	 */
	protected _updateVariant(
		srcMaterial: BaseMaterial,
		dstMaterial: VariantMaterial,
		params: MaterialParams,
	): VariantMaterial {
		if (srcMaterial.type === dstMaterial.type) {
			dstMaterial.copy(srcMaterial);
		} else if (dstMaterial instanceof LineBasicMaterial) {
			Material.prototype.copy.call(dstMaterial, srcMaterial);
			dstMaterial.color.copy(srcMaterial.color);
		} else if (dstMaterial instanceof PointsMaterial) {
			Material.prototype.copy.call(dstMaterial, srcMaterial);
			dstMaterial.color.copy(srcMaterial.color);
			dstMaterial.map = srcMaterial.map;
			dstMaterial.sizeAttenuation = false;
		}

		dstMaterial.vertexColors = params.useVertexColors;
		if (dstMaterial instanceof MeshStandardMaterial) {
			dstMaterial.flatShading = params.useFlatShading;
			// https://github.com/mrdoob/three.js/issues/11438#issuecomment-507003995
			dstMaterial.normalScale.y = params.useVertexTangents
				? Math.abs(dstMaterial.normalScale.y)
				: -1 * dstMaterial.normalScale.y;
			if (dstMaterial instanceof MeshPhysicalMaterial) {
				dstMaterial.clearcoatNormalScale.y = params.useVertexTangents
					? Math.abs(dstMaterial.clearcoatNormalScale.y)
					: -1 * dstMaterial.clearcoatNormalScale.y;
			}
		}

		if (dstMaterial.version < srcMaterial.version) {
			dstMaterial.version = srcMaterial.version;
		}

		return dstMaterial;
	}
}
