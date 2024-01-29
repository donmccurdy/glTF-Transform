import { vec3, vec4, mat4, Accessor, Primitive } from '@gltf-transform/core';
import { create as createMat3, fromMat4, invert, transpose } from 'gl-matrix/mat3';
import { create as createVec3, normalize as normalizeVec3, transformMat3, transformMat4 } from 'gl-matrix/vec3';
import { create as createVec4 } from 'gl-matrix/vec4';
import { createIndices } from './utils.js';
import { weldPrimitive } from './weld.js';
import { determinant } from 'gl-matrix/mat4';

/**
 * Applies a transform matrix to a {@link Primitive}.
 *
 * When calling {@link transformPrimitive}, any un-masked vertices are overwritten
 * directly in the underlying vertex streams. If streams should be detached instead,
 * see {@link transformMesh}.
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
 * @param skipIndices Vertices, specified by index, to be _excluded_ from the transformation.
 */
export function transformPrimitive(prim: Primitive, matrix: mat4, skipIndices = new Set<number>()): void {
	const position = prim.getAttribute('POSITION')!;
	const indices = (prim.getIndices()?.getArray() || createIndices(position!.getCount())) as Uint32Array;

	// Apply transform to base attributes.
	if (position) {
		applyMatrix(matrix, position, indices, new Set(skipIndices));
	}

	const normal = prim.getAttribute('NORMAL');
	if (normal) {
		applyNormalMatrix(matrix, normal, indices, new Set(skipIndices));
	}

	const tangent = prim.getAttribute('TANGENT');
	if (tangent) {
		applyTangentMatrix(matrix, tangent, indices, new Set(skipIndices));
	}

	// Apply transform to morph attributes.
	for (const target of prim.listTargets()) {
		const position = target.getAttribute('POSITION');
		if (position) {
			applyMatrix(matrix, position, indices, new Set(skipIndices));
		}

		const normal = target.getAttribute('NORMAL');
		if (normal) {
			applyNormalMatrix(matrix, normal, indices, new Set(skipIndices));
		}

		const tangent = target.getAttribute('TANGENT');
		if (tangent) {
			applyTangentMatrix(matrix, tangent, indices, new Set(skipIndices));
		}
	}

	// Reverse winding order if scale is negative.
	// See: https://github.com/KhronosGroup/glTF-Sample-Models/tree/master/2.0/NegativeScaleTest
	if (determinant(matrix) < 0) {
		reversePrimitiveWindingOrder(prim);
	}

	// Update mask.
	for (let i = 0; i < indices.length; i++) skipIndices.add(indices[i]);
}

function applyMatrix(matrix: mat4, attribute: Accessor, indices: Uint32Array, skipIndices: Set<number>) {
	// An arbitrary transform may not keep vertex positions in the required
	// range of a normalized attribute. Replace the array, instead.
	const srcArray = attribute.getArray()!;
	const dstArray = new Float32Array(attribute.getCount() * 3);
	const elementSize = attribute.getElementSize();

	for (let index = 0, el: number[] = [], il = attribute.getCount(); index < il; index++) {
		el = attribute.getElementInternal(index, el, srcArray, elementSize);
		dstArray.set(el, index * elementSize);
	}

	const vector = createVec3() as vec3;
	for (let i = 0; i < indices.length; i++) {
		const index = indices[i];
		if (skipIndices.has(index)) continue;

		attribute.getElementInternal(index, vector, srcArray, elementSize);

		transformMat4(vector, vector, matrix);
		dstArray.set(vector, index * 3);

		skipIndices.add(index);
	}

	attribute.setArray(dstArray).setNormalized(false);
}

function applyNormalMatrix(matrix: mat4, attribute: Accessor, indices: Uint32Array, skipIndices: Set<number>) {
	const array = attribute.getArray()!;
	const elementSize = attribute.getElementSize();

	const normalMatrix = createMat3();
	fromMat4(normalMatrix, matrix);
	invert(normalMatrix, normalMatrix);
	transpose(normalMatrix, normalMatrix);

	const vector = createVec3() as vec3;
	for (let i = 0; i < indices.length; i++) {
		const index = indices[i];
		if (skipIndices.has(index)) continue;

		attribute.getElementInternal(index, vector, array, elementSize);
		transformMat3(vector, vector, normalMatrix);
		normalizeVec3(vector, vector);
		attribute.setElementInternal(index, vector, array, elementSize);

		skipIndices.add(index);
	}
}

function applyTangentMatrix(matrix: mat4, attribute: Accessor, indices: Uint32Array, skipIndices: Set<number>) {
	const array = attribute.getArray()!;
	const elementSize = attribute.getElementSize();

	const v3 = createVec3() as vec3;
	const v4 = createVec4() as vec4;
	for (let i = 0; i < indices.length; i++) {
		const index = indices[i];
		if (skipIndices.has(index)) continue;

		attribute.getElementInternal(index, v4, array, elementSize);

		// mat4 affine matrix applied to vector, vector interpreted as a direction.
		// Reference: https://github.com/mrdoob/three.js/blob/9f4de99828c05e71c47e6de0beb4c6e7652e486a/src/math/Vector3.js#L286-L300
		const [x, y, z] = v4;
		v3[0] = matrix[0] * x + matrix[4] * y + matrix[8] * z;
		v3[1] = matrix[1] * x + matrix[5] * y + matrix[9] * z;
		v3[2] = matrix[2] * x + matrix[6] * y + matrix[10] * z;
		normalizeVec3(v3, v3);

		(v4[0] = v3[0]), (v4[1] = v3[1]), (v4[2] = v3[2]);

		attribute.setElementInternal(index, v4, array, elementSize);

		skipIndices.add(index);
	}
}

function reversePrimitiveWindingOrder(prim: Primitive) {
	if (prim.getMode() !== Primitive.Mode.TRIANGLES) return;
	if (!prim.getIndices()) weldPrimitive(prim, { tolerance: 0 });

	const indices = prim.getIndices()!;
	for (let i = 0, il = indices.getCount(); i < il; i += 3) {
		const a = indices.getScalar(i);
		const c = indices.getScalar(i + 2);
		indices.setScalar(i, c);
		indices.setScalar(i + 2, a);
	}
}
