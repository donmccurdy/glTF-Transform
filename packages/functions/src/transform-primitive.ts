import { vec3, vec4, mat4, Accessor, Primitive, TypedArray } from '@gltf-transform/core';
import { create as createMat3, fromMat4, invert, transpose } from 'gl-matrix/mat3';
import { create as createVec3, normalize as normalizeVec3, transformMat3, transformMat4 } from 'gl-matrix/vec3';
import { create as createVec4 } from 'gl-matrix/vec4';
import { determinant } from 'gl-matrix/mat4';
import { indexPrimitive } from './index-primitive.js';

/**
 * Implements a {@link Set} for maintaining a collection of integer indices,
 * with minimal performance and memory overhead over multiple passes.
 */
class IndexSet {
	private readonly _array: Uint32Array;
	private _clearCount = 0;
	private readonly _clearLimit: number;

	constructor(array: Uint32Array) {
		this._array = array;
		this._clearLimit = Math.pow(2, array.BYTES_PER_ELEMENT * 8) - 1;
	}

	/** Returns true if the given index exists in the collection. */
	public has(index: number): boolean {
		return this._array[index] > this._clearCount;
	}

	/** Adds the given index to the collection. */
	public add(index: number) {
		this._array[index] = this._clearCount + 1;
	}

	/** Clears all indices added in the most recent pass. */
	public clear(): void {
		this._clearCount++;

		if (this._clearCount > this._clearLimit) {
			throw new Error('IndexMask size limit exceeded.');
		}
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
	const position = prim.getAttribute('POSITION')!;
	const positionCount = position.getCount();
	const indices = prim.getIndices();
	const indicesArray = indices ? indices.getArray() : null;
	const indicesCount = indices ? indices.getCount() : positionCount;

	const skipIndicesSet = new IndexSet(skipIndices || new Uint32Array(position.getCount()));

	// Apply transform to base attributes.
	if (position) {
		applyMatrix(matrix, position, indicesArray, skipIndicesSet);
	}

	const normal = prim.getAttribute('NORMAL');
	if (normal) {
		applyNormalMatrix(matrix, normal, indicesArray, skipIndicesSet);
	}

	const tangent = prim.getAttribute('TANGENT');
	if (tangent) {
		applyTangentMatrix(matrix, tangent, indicesArray, skipIndicesSet);
	}

	// Apply transform to morph attributes.
	for (const target of prim.listTargets()) {
		const position = target.getAttribute('POSITION');
		if (position) {
			applyMatrix(matrix, position, indicesArray, skipIndicesSet);
		}

		const normal = target.getAttribute('NORMAL');
		if (normal) {
			applyNormalMatrix(matrix, normal, indicesArray, skipIndicesSet);
		}

		const tangent = target.getAttribute('TANGENT');
		if (tangent) {
			applyTangentMatrix(matrix, tangent, indicesArray, skipIndicesSet);
		}
	}

	// Reverse winding order if scale is negative.
	// See: https://github.com/KhronosGroup/glTF-Sample-Models/tree/master/2.0/NegativeScaleTest
	if (determinant(matrix) < 0) {
		reversePrimitiveWindingOrder(prim);
	}

	// IMPORTANT: IndexMask increments `skipIndices` once per attribute. Once we're done
	// with all attributes on this primitive, max out the affected `skipIndices` values.
	for (let i = 0; skipIndices && i < indicesCount; i++) {
		const index = indicesArray ? indicesArray[i] : i;
		skipIndices[index] = -1;
	}
}

function applyMatrix(matrix: mat4, attribute: Accessor, indices: TypedArray | null, skipIndices: IndexSet) {
	// An arbitrary transform may not keep vertex positions in the required
	// range of a normalized attribute. Replace the array, instead.
	const srcArray = attribute.getArray()!;
	const dstArray = new Float32Array(attribute.getCount() * 3);
	const elementSize = attribute.getElementSize();

	for (let index = 0, el: number[] = [], il = attribute.getCount(); index < il; index++) {
		el = attribute.getElementInternal(index, el, srcArray, elementSize);
		dstArray.set(el, index * elementSize);
	}

	const count = indices ? indices.length : attribute.getCount();
	const vector = createVec3() as vec3;
	for (let i = 0; i < count; i++) {
		const index = indices ? indices[i] : i;
		if (skipIndices.has(index)) continue;

		attribute.getElementInternal(index, vector, srcArray, elementSize);

		transformMat4(vector, vector, matrix);
		dstArray.set(vector, index * 3);

		skipIndices.add(index);
	}

	attribute.setArray(dstArray).setNormalized(false);

	skipIndices.clear();
}

function applyNormalMatrix(matrix: mat4, attribute: Accessor, indices: TypedArray | null, skipIndices: IndexSet) {
	const array = attribute.getArray()!;
	const elementSize = attribute.getElementSize();

	const normalMatrix = createMat3();
	fromMat4(normalMatrix, matrix);
	invert(normalMatrix, normalMatrix);
	transpose(normalMatrix, normalMatrix);

	const count = indices ? indices.length : attribute.getCount();
	const vector = createVec3() as vec3;
	for (let i = 0; i < count; i++) {
		const index = indices ? indices[i] : i;
		if (skipIndices.has(index)) continue;

		attribute.getElementInternal(index, vector, array, elementSize);
		transformMat3(vector, vector, normalMatrix);
		normalizeVec3(vector, vector);
		attribute.setElementInternal(index, vector, array, elementSize);

		skipIndices.add(index);
	}

	skipIndices.clear();
}

function applyTangentMatrix(matrix: mat4, attribute: Accessor, indices: TypedArray | null, skipIndices: IndexSet) {
	const array = attribute.getArray()!;
	const elementSize = attribute.getElementSize();

	const count = indices ? indices.length : attribute.getCount();
	const v3 = createVec3() as vec3;
	const v4 = createVec4() as vec4;
	for (let i = 0; i < count; i++) {
		const index = indices ? indices[i] : i;
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

	skipIndices.clear();
}

function reversePrimitiveWindingOrder(prim: Primitive) {
	if (prim.getMode() !== Primitive.Mode.TRIANGLES) return;
	if (!prim.getIndices()) indexPrimitive(prim);

	const indices = prim.getIndices()!;
	for (let i = 0, il = indices.getCount(); i < il; i += 3) {
		const a = indices.getScalar(i);
		const c = indices.getScalar(i + 2);
		indices.setScalar(i, c);
		indices.setScalar(i + 2, a);
	}
}
