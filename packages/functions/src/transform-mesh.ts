import { mat4, Mesh } from '@gltf-transform/core';
import { transformPrimitive } from './transform-primitive.js';
import { compactPrimitive } from './compact-primitive.js';

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
 */
export function transformMesh(mesh: Mesh, matrix: mat4): void {
	for (const prim of mesh.listPrimitives()) {
		compactPrimitive(prim);
		transformPrimitive(prim, matrix);
	}

	// const attributeSkipIndices = new Map<Accessor, Uint32Array>();
	// for (const prim of mesh.listPrimitives()) {
	// 	const position = prim.getAttribute('POSITION')!;

	// 	let primSkipIndices: Uint32Array;
	// 	if (attributeSkipIndices.has(position)) {
	// 		primSkipIndices = attributeSkipIndices.get(position)!;
	// 	} else {
	// 		attributeSkipIndices.set(position, (primSkipIndices = new Uint32Array(position.getCount())));
	// 	}

	// 	transformPrimitive(prim, matrix, primSkipIndices);
	// }
}
