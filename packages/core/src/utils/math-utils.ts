import { determinant, getRotation } from 'gl-matrix/mat4';
import { length } from 'gl-matrix/vec3';
import type { mat4, vec3, vec4 } from '../constants.js';
import type { GLTF } from '../types/gltf.js';

/** @hidden */
export class MathUtils {
	public static identity(v: number): number {
		return v;
	}

	public static eq(a: number[], b: number[], tolerance = 10e-6): boolean {
		if (a.length !== b.length) return false;

		for (let i = 0; i < a.length; i++) {
			if (Math.abs(a[i] - b[i]) > tolerance) return false;
		}

		return true;
	}

	// TODO(v4): Compare performance if we replace the switch with individual functions.
	public static decodeNormalizedInt(i: number, componentType: GLTF.AccessorComponentType): number {
		// Hardcode enums from accessor.ts to avoid a circular dependency.
		switch (componentType) {
			case 5126: // FLOAT
				return i;
			case 5123: // UNSIGNED_SHORT
				return i / 65535.0;
			case 5121: // UNSIGNED_BYTE
				return i / 255.0;
			case 5122: // SHORT
				return Math.max(i / 32767.0, -1.0);
			case 5120: // BYTE
				return Math.max(i / 127.0, -1.0);
			default:
				throw new Error('Invalid component type.');
		}
	}

	/** @deprecated Renamed to {@link MathUtils.decodeNormalizedInt}. */
	public static denormalize(i: number, componentType: GLTF.AccessorComponentType): number {
		return MathUtils.decodeNormalizedInt(i, componentType);
	}

	// TODO(v4): Compare performance if we replace the switch with individual functions.
	// TODO(v4): Consider clamping to [0, 1] or [-1, 1] here.
	public static encodeNormalizedInt(f: number, componentType: GLTF.AccessorComponentType): number {
		// Hardcode enums from accessor.ts to avoid a circular dependency.
		switch (componentType) {
			case 5126: // FLOAT
				return f;
			case 5123: // UNSIGNED_SHORT
				return Math.round(f * 65535.0);
			case 5121: // UNSIGNED_BYTE
				return Math.round(f * 255.0);
			case 5122: // SHORT
				return Math.round(f * 32767.0);
			case 5120: // BYTE
				return Math.round(f * 127.0);
			default:
				throw new Error('Invalid component type.');
		}
	}

	/** @deprecated Renamed to {@link MathUtils.encodeNormalizedInt}. */
	public static normalize(f: number, componentType: GLTF.AccessorComponentType): number {
		return MathUtils.encodeNormalizedInt(f, componentType);
	}

	/**
	 * Decompose a mat4 to TRS properties.
	 *
	 * Equivalent to the Matrix4 decompose() method in three.js, and intentionally not using the
	 * gl-matrix version. See: https://github.com/toji/gl-matrix/issues/408
	 *
	 * @param srcMat Matrix element, to be decomposed to TRS properties.
	 * @param dstTranslation Translation element, to be overwritten.
	 * @param dstRotation Rotation element, to be overwritten.
	 * @param dstScale Scale element, to be overwritten.
	 */
	public static decompose(srcMat: mat4, dstTranslation: vec3, dstRotation: vec4, dstScale: vec3): void {
		let sx = length([srcMat[0], srcMat[1], srcMat[2]]);
		const sy = length([srcMat[4], srcMat[5], srcMat[6]]);
		const sz = length([srcMat[8], srcMat[9], srcMat[10]]);

		// if determine is negative, we need to invert one scale
		const det = determinant(srcMat);
		if (det < 0) sx = -sx;

		dstTranslation[0] = srcMat[12];
		dstTranslation[1] = srcMat[13];
		dstTranslation[2] = srcMat[14];

		// scale the rotation part
		const _m1 = srcMat.slice();

		const invSX = 1 / sx;
		const invSY = 1 / sy;
		const invSZ = 1 / sz;

		_m1[0] *= invSX;
		_m1[1] *= invSX;
		_m1[2] *= invSX;

		_m1[4] *= invSY;
		_m1[5] *= invSY;
		_m1[6] *= invSY;

		_m1[8] *= invSZ;
		_m1[9] *= invSZ;
		_m1[10] *= invSZ;

		getRotation(dstRotation, _m1 as mat4);

		dstScale[0] = sx;
		dstScale[1] = sy;
		dstScale[2] = sz;
	}

	/**
	 * Compose TRS properties to a mat4.
	 *
	 * Equivalent to the Matrix4 compose() method in three.js, and intentionally not using the
	 * gl-matrix version. See: https://github.com/toji/gl-matrix/issues/408
	 *
	 * @param srcTranslation Translation element of matrix.
	 * @param srcRotation Rotation element of matrix.
	 * @param srcScale Scale element of matrix.
	 * @param dstMat Matrix element, to be modified and returned.
	 * @returns dstMat, overwritten to mat4 equivalent of given TRS properties.
	 */
	public static compose(srcTranslation: vec3, srcRotation: vec4, srcScale: vec3, dstMat: mat4): mat4 {
		const te = dstMat;

		const x = srcRotation[0],
			y = srcRotation[1],
			z = srcRotation[2],
			w = srcRotation[3];
		const x2 = x + x,
			y2 = y + y,
			z2 = z + z;
		const xx = x * x2,
			xy = x * y2,
			xz = x * z2;
		const yy = y * y2,
			yz = y * z2,
			zz = z * z2;
		const wx = w * x2,
			wy = w * y2,
			wz = w * z2;

		const sx = srcScale[0],
			sy = srcScale[1],
			sz = srcScale[2];

		te[0] = (1 - (yy + zz)) * sx;
		te[1] = (xy + wz) * sx;
		te[2] = (xz - wy) * sx;
		te[3] = 0;

		te[4] = (xy - wz) * sy;
		te[5] = (1 - (xx + zz)) * sy;
		te[6] = (yz + wx) * sy;
		te[7] = 0;

		te[8] = (xz + wy) * sz;
		te[9] = (yz - wx) * sz;
		te[10] = (1 - (xx + yy)) * sz;
		te[11] = 0;

		te[12] = srcTranslation[0];
		te[13] = srcTranslation[1];
		te[14] = srcTranslation[2];
		te[15] = 1;

		return te;
	}
}
