import { vec3, mat4, Accessor, Primitive, vec4, Mesh, PropertyType, PrimitiveTarget } from '@gltf-transform/core';
import { create as createMat3, fromMat4, invert, transpose } from 'gl-matrix/mat3';
import { create as createVec3, normalize as normalizeVec3, transformMat3, transformMat4 } from 'gl-matrix/vec3';
import { create as createVec4 } from 'gl-matrix/vec4';
import { createIndices, deepListAttributes } from './utils';

/**
 * Applies a transform matrix to every {@link Primitive} in the given {@link Mesh}.
 *
 * Method:
 * - If any primitives are shared by other meshes, they will be detached.
 * - If any vertex streams are shared by primitives of other meshes, vertex data
 *  will be overwritten unless _overwrite=false_ or the indices are masked. If
 * 	_overwrite=false_, a detached copy of the vertex stream is made before applying
 * 	the transform.
 * - Primitives within the mesh sharing vertex streams will continue to share those streams.
 * - For indexed primitives, only indexed vertices are modified.
 *
 * Example:
 *
 * ```javascript
 * import { fromTranslation } from 'gl-matrix/mat4';
 * import { transformMesh } from '@gltf-transform/functions';
 *
 * // offset vertices, y += 10.
 * transformMesh(mesh, fromTranslation([], [0, 10, 0]));
 * ```
 *
 * @param mesh
 * @param matrix
 * @param overwrite Whether to overwrite vertex streams in place. If false,
 * 		streams shared with other meshes will be detached.
 * @param skipIndices Vertices, specified by index, to be _excluded_ from the transformation.
 */
export function transformMesh(mesh: Mesh, matrix: mat4, overwrite = false, skipIndices?: Set<number>): void {
	// (1) Detach shared prims.
	for (const srcPrim of mesh.listPrimitives()) {
		const isShared = srcPrim.listParents().some((p) => p.propertyType === PropertyType.MESH && p !== mesh);
		if (isShared) {
			const dstPrim = srcPrim.clone();
			mesh.swap(srcPrim, dstPrim);

			for (const srcTarget of dstPrim.listTargets()) {
				const dstTarget = srcTarget.clone();
				dstPrim.swap(srcTarget, dstTarget);
			}
		}
	}

	// (2) Detach shared vertex streams.
	if (!overwrite) {
		const parents = new Set<Primitive | PrimitiveTarget>([
			...mesh.listPrimitives(),
			...mesh.listPrimitives().flatMap((prim) => prim.listTargets()),
		]);
		const attributes = new Map<Accessor, Accessor>();
		for (const prim of mesh.listPrimitives()) {
			for (const srcAttribute of deepListAttributes(prim)) {
				const isShared = srcAttribute
					.listParents()
					.some((a) => (a instanceof Primitive || a instanceof PrimitiveTarget) && !parents.has(a));
				if (isShared && !attributes.has(srcAttribute)) {
					attributes.set(srcAttribute, srcAttribute.clone());
				}
			}
		}
		for (const parent of parents) {
			for (const [srcAttribute, dstAttribute] of attributes) {
				parent.swap(srcAttribute, dstAttribute);
			}
		}
	}

	// (3) Apply transform.
	skipIndices = skipIndices || new Set<number>();
	for (const prim of mesh.listPrimitives()) {
		transformPrimitive(prim, matrix, skipIndices);
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

	// Update mask.
	for (let i = 0; i < indices.length; i++) skipIndices.add(indices[i]);
}

function applyMatrix(matrix: mat4, attribute: Accessor, indices: Uint32Array, skipIndices: Set<number>) {
	// An arbitrary transform may not keep vertex positions in the required
	// range of a normalized attribute. Replace the array, instead.
	const dstArray = new Float32Array(attribute.getCount() * 3);
	const elementSize = attribute.getElementSize();

	for (let i = 0, el: number[] = [], il = attribute.getCount(); i < il; i++) {
		dstArray.set(attribute.getElement(i, el), i * elementSize);
	}

	const vector = createVec3() as vec3;
	for (let i = 0; i < indices.length; i++) {
		const index = indices[i];
		if (skipIndices.has(index)) continue;

		attribute.getElement(index, vector);
		transformMat4(vector, vector, matrix);
		dstArray.set(vector, index * 3);

		skipIndices.add(index);
	}

	attribute.setArray(dstArray).setNormalized(false);
}

function applyNormalMatrix(matrix: mat4, attribute: Accessor, indices: Uint32Array, skipIndices: Set<number>) {
	const normalMatrix = createMat3();
	fromMat4(normalMatrix, matrix);
	invert(normalMatrix, normalMatrix);
	transpose(normalMatrix, normalMatrix);

	const vector = createVec3() as vec3;
	for (let i = 0; i < indices.length; i++) {
		const index = indices[i];
		if (skipIndices.has(index)) continue;

		attribute.getElement(index, vector);
		transformMat3(vector, vector, normalMatrix);
		normalizeVec3(vector, vector);
		attribute.setElement(index, vector);

		skipIndices.add(index);
	}
}

function applyTangentMatrix(matrix: mat4, attribute: Accessor, indices: Uint32Array, skipIndices: Set<number>) {
	const v3 = createVec3() as vec3;
	const v4 = createVec4() as vec4;
	for (let i = 0; i < indices.length; i++) {
		const index = indices[i];
		if (skipIndices.has(index)) continue;

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

		skipIndices.add(index);
	}
}
