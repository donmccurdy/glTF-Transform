import { vec3, mat4, Accessor, Primitive, MathUtils } from '@gltf-transform/core';
import { create as createMat3, fromMat4, invert, transpose } from 'gl-matrix/mat3';
import { create as createVec3, normalize as normalizeVec3, transformMat3, transformMat4 } from 'gl-matrix/vec3';
import { weldPrimitive } from './weld.js';
import { determinant } from 'gl-matrix/mat4';

const { FLOAT } = Accessor.ComponentType;

/**
 * Applies a transform matrix to a {@link Primitive}.
 *
 * All vertex attributes on the Primitive and its
 * {@link PrimitiveTarget PrimitiveTargets} are modified in place. If vertex
 * streams are shared with other Primitives, and overwriting the shared vertex
 * attributes is not desired, use {@link compactPrimitive} to pre-process
 * the Primitive or call {@link transformMesh} instead.
 *
 * Example:
 *
 * ```javascript
 * import { fromTranslation } from 'gl-matrix/mat4';
 * import { transformPrimitive } from '@gltf-transform/functions';
 *
 * // offset vertices, y += 10.
 * transformPrimitive(prim, fromTranslation([], [0, 10, 0]));
 * ```
 *
 * @param prim
 * @param matrix
 */
export function transformPrimitive(prim: Primitive, matrix: mat4): void {
	// Apply transform to base attributes.
	const position = prim.getAttribute('POSITION');
	if (position) {
		applyMatrix(matrix, position);
	}

	const normal = prim.getAttribute('NORMAL');
	if (normal) {
		applyNormalMatrix(matrix, normal);
	}

	const tangent = prim.getAttribute('TANGENT');
	if (tangent) {
		applyTangentMatrix(matrix, tangent);
	}

	// Apply transform to morph attributes.
	for (const target of prim.listTargets()) {
		const position = target.getAttribute('POSITION');
		if (position) {
			applyMatrix(matrix, position);
		}

		const normal = target.getAttribute('NORMAL');
		if (normal) {
			applyNormalMatrix(matrix, normal);
		}

		const tangent = target.getAttribute('TANGENT');
		if (tangent) {
			applyTangentMatrix(matrix, tangent);
		}
	}

	// Reverse winding order if scale is negative.
	// See: https://github.com/KhronosGroup/glTF-Sample-Models/tree/master/2.0/NegativeScaleTest
	if (determinant(matrix) < 0) {
		reversePrimitiveWindingOrder(prim);
	}
}

function applyMatrix(matrix: mat4, attribute: Accessor) {
	const componentType = attribute.getComponentType();
	const normalized = attribute.getNormalized();
	const srcArray = attribute.getArray()!;
	const dstArray = componentType === FLOAT ? srcArray : new Float32Array(srcArray.length);

	const vector = createVec3() as vec3;
	for (let i = 0, il = attribute.getCount(); i < il; i++) {
		if (normalized) {
			vector[0] = MathUtils.decodeNormalizedInt(srcArray[i * 3], componentType);
			vector[1] = MathUtils.decodeNormalizedInt(srcArray[i * 3 + 1], componentType);
			vector[2] = MathUtils.decodeNormalizedInt(srcArray[i * 3 + 2], componentType);
		} else {
			vector[0] = srcArray[i * 3];
			vector[1] = srcArray[i * 3 + 1];
			vector[2] = srcArray[i * 3 + 2];
		}

		transformMat4(vector, vector, matrix);

		dstArray[i * 3] = vector[0];
		dstArray[i * 3 + 1] = vector[1];
		dstArray[i * 3 + 2] = vector[2];
	}

	attribute.setArray(dstArray).setNormalized(false);
}

function applyNormalMatrix(matrix: mat4, attribute: Accessor) {
	const array = attribute.getArray()!;
	const normalized = attribute.getNormalized();
	const componentType = attribute.getComponentType();

	const normalMatrix = createMat3();
	fromMat4(normalMatrix, matrix);
	invert(normalMatrix, normalMatrix);
	transpose(normalMatrix, normalMatrix);

	const vector = createVec3() as vec3;
	for (let i = 0, il = attribute.getCount(); i < il; i++) {
		if (normalized) {
			vector[0] = MathUtils.decodeNormalizedInt(array[i * 3], componentType);
			vector[1] = MathUtils.decodeNormalizedInt(array[i * 3 + 1], componentType);
			vector[2] = MathUtils.decodeNormalizedInt(array[i * 3 + 2], componentType);
		} else {
			vector[0] = array[i * 3];
			vector[1] = array[i * 3 + 1];
			vector[2] = array[i * 3 + 2];
		}

		transformMat3(vector, vector, normalMatrix);
		normalizeVec3(vector, vector);

		if (normalized) {
			array[i * 3] = MathUtils.decodeNormalizedInt(vector[0], componentType);
			array[i * 3 + 1] = MathUtils.decodeNormalizedInt(vector[1], componentType);
			array[i * 3 + 2] = MathUtils.decodeNormalizedInt(vector[2], componentType);
		} else {
			array[i * 3] = vector[0];
			array[i * 3 + 1] = vector[1];
			array[i * 3 + 2] = vector[2];
		}
	}
}

function applyTangentMatrix(matrix: mat4, attribute: Accessor) {
	const array = attribute.getArray()!;
	const normalized = attribute.getNormalized();
	const componentType = attribute.getComponentType();

	const v3 = createVec3() as vec3;
	for (let i = 0, il = attribute.getCount(); i < il; i++) {
		if (normalized) {
			v3[0] = MathUtils.decodeNormalizedInt(array[i * 4], componentType);
			v3[1] = MathUtils.decodeNormalizedInt(array[i * 4 + 1], componentType);
			v3[2] = MathUtils.decodeNormalizedInt(array[i * 4 + 2], componentType);
		} else {
			v3[0] = array[i * 4];
			v3[1] = array[i * 4 + 1];
			v3[2] = array[i * 4 + 2];
		}

		// mat4 affine matrix applied to vector, vector interpreted as a direction.
		// Reference: https://github.com/mrdoob/three.js/blob/9f4de99828c05e71c47e6de0beb4c6e7652e486a/src/math/Vector3.js#L286-L300
		v3[0] = matrix[0] * v3[0] + matrix[4] * v3[1] + matrix[8] * v3[2];
		v3[1] = matrix[1] * v3[0] + matrix[5] * v3[1] + matrix[9] * v3[2];
		v3[2] = matrix[2] * v3[0] + matrix[6] * v3[1] + matrix[10] * v3[2];
		normalizeVec3(v3, v3);

		if (normalized) {
			array[i * 4] = MathUtils.decodeNormalizedInt(v3[0], componentType);
			array[i * 4 + 1] = MathUtils.decodeNormalizedInt(v3[1], componentType);
			array[i * 4 + 2] = MathUtils.decodeNormalizedInt(v3[2], componentType);
		} else {
			array[i * 4] = v3[0];
			array[i * 4 + 1] = v3[1];
			array[i * 4 + 2] = v3[2];
		}
	}
}

function reversePrimitiveWindingOrder(prim: Primitive) {
	if (prim.getMode() !== Primitive.Mode.TRIANGLES) return;
	if (!prim.getIndices()) weldPrimitive(prim);

	const indices = prim.getIndices()!;
	for (let i = 0, il = indices.getCount(); i < il; i += 3) {
		const a = indices.getScalar(i);
		const c = indices.getScalar(i + 2);
		indices.setScalar(i, c);
		indices.setScalar(i + 2, a);
	}
}
