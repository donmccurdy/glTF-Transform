import { vec3, vec4, mat4, Accessor, Primitive, TypedArray } from '@gltf-transform/core';
import { create as createMat3, fromMat4, invert, transpose } from 'gl-matrix/mat3';
import { create as createVec3, normalize as normalizeVec3, transformMat3, transformMat4 } from 'gl-matrix/vec3';
import { create as createVec4 } from 'gl-matrix/vec4';
import { weldPrimitive } from './weld.js';
import { determinant } from 'gl-matrix/mat4';
import { dequantizeAttributeArray } from './dequantize.js';
import { VertexCountMethod, getPrimitiveVertexCount } from './get-vertex-count.js';

class Uint32Set {
	private _array: Uint32Array;
	private _false = 0;
	private _true = 1;
	constructor(array: Uint32Array) {
		this._array = array;
	}
	add(i: number): void {
		this._array[i] = this._true;
	}
	has(i: number): boolean {
		return this._array[i] === this._true;
	}
	clear(): this {
		this._array.fill(0);
		return this;
	}
}

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
export function transformPrimitive(prim: Primitive, matrix: mat4, skipIndices?: Uint32Array): void {
	const vertexCount = getPrimitiveVertexCount(prim, VertexCountMethod.UPLOAD);
	const indices = prim.getIndices();
	const indicesArray = indices ? indices.getArray() || undefined : undefined;

	let skipSet: Uint32Set | undefined;
	if (skipIndices) {
		skipSet = new Uint32Set(skipIndices.slice());
	} else if (indicesArray) {
		skipSet = new Uint32Set(new Uint32Array(vertexCount));
	}

	// Apply transform to base attributes.
	const position = prim.getAttribute('POSITION');
	if (position) {
		applyMatrix(matrix, position, indicesArray, skipSet);
	}

	const normal = prim.getAttribute('NORMAL');
	if (normal) {
		applyNormalMatrix(matrix, normal, indicesArray, skipSet?.clear());
	}

	const tangent = prim.getAttribute('TANGENT');
	if (tangent) {
		applyTangentMatrix(matrix, tangent, indicesArray, skipSet?.clear());
	}

	// Apply transform to morph attributes.
	for (const target of prim.listTargets()) {
		const position = target.getAttribute('POSITION');
		if (position) {
			applyMatrix(matrix, position, indicesArray, skipSet?.clear());
		}

		const normal = target.getAttribute('NORMAL');
		if (normal) {
			applyNormalMatrix(matrix, normal, indicesArray, skipSet?.clear());
		}

		const tangent = target.getAttribute('TANGENT');
		if (tangent) {
			applyTangentMatrix(matrix, tangent, indicesArray, skipSet?.clear());
		}
	}

	// Reverse winding order if scale is negative.
	// See: https://github.com/KhronosGroup/glTF-Sample-Models/tree/master/2.0/NegativeScaleTest
	if (determinant(matrix) < 0) {
		reversePrimitiveWindingOrder(prim);
	}

	// Update mask.
	if (skipIndices) {
		for (let i = 0, il = indicesArray ? indicesArray.length : vertexCount; i < il; i++) {
			skipIndices[indicesArray ? indicesArray[i] : i] = 1;
		}
	}
}

function applyMatrix(matrix: mat4, attribute: Accessor, indices?: TypedArray, skipIndices?: Uint32Set) {
	// An arbitrary transform may not keep vertex positions in the required
	// range of a normalized attribute. Replace the array, instead.
	const srcArray = attribute.getArray()!;
	const dstArray = dequantizeAttributeArray(srcArray, attribute.getComponentType(), attribute.getNormalized());
	const elementSize = attribute.getElementSize();
	const vertexCount = attribute.getCount();

	const vector = createVec3() as vec3;
	for (let i = 0, il = indices ? indices.length : vertexCount; i < il; i++) {
		const index = indices ? indices[i] : i;
		if (skipIndices && skipIndices.has(index)) continue;

		attribute.getElement(index, vector);
		transformMat4(vector, vector, matrix);
		dstArray.set(vector, index * elementSize);

		if (skipIndices) skipIndices.add(index);
	}

	attribute.setArray(dstArray).setNormalized(false);
}

function applyNormalMatrix(matrix: mat4, attribute: Accessor, indices?: TypedArray, skipIndices?: Uint32Set) {
	const normalMatrix = createMat3();
	fromMat4(normalMatrix, matrix);
	invert(normalMatrix, normalMatrix);
	transpose(normalMatrix, normalMatrix);

	const vertexCount = attribute.getCount();
	const vector = createVec3() as vec3;
	for (let i = 0, il = indices ? indices.length : vertexCount; i < il; i++) {
		const index = indices ? indices[i] : i;
		if (skipIndices && skipIndices.has(index)) continue;

		attribute.getElement(index, vector);
		transformMat3(vector, vector, normalMatrix);
		normalizeVec3(vector, vector);
		attribute.setElement(index, vector);

		if (skipIndices) skipIndices.add(index);
	}
}

function applyTangentMatrix(matrix: mat4, attribute: Accessor, indices?: TypedArray, skipIndices?: Uint32Set) {
	const v3 = createVec3() as vec3;
	const v4 = createVec4() as vec4;
	const vertexCount = attribute.getCount();
	for (let i = 0, il = indices ? indices.length : vertexCount; i < il; i++) {
		const index = indices ? indices[i] : i;
		if (skipIndices && skipIndices.has(index)) continue;

		attribute.getElement(index, v4);

		// mat4 affine matrix applied to vector, vector interpreted as a direction.
		// Reference: https://github.com/mrdoob/three.js/blob/9f4de99828c05e71c47e6de0beb4c6e7652e486a/src/math/Vector3.js#L286-L300
		const [x, y, z] = v4;
		v3[0] = matrix[0] * x + matrix[4] * y + matrix[8] * z;
		v3[1] = matrix[1] * x + matrix[5] * y + matrix[9] * z;
		v3[2] = matrix[2] * x + matrix[6] * y + matrix[10] * z;
		normalizeVec3(v3, v3);

		(v4[0] = v3[0]), (v4[1] = v3[1]), (v4[2] = v3[2]);

		attribute.setElement(index, v4);

		if (skipIndices) skipIndices.add(index);
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
