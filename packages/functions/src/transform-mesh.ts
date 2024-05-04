import { mat4, Mesh } from '@gltf-transform/core';
import { transformPrimitive } from './transform-primitive.js';
import { compactPrimitive } from './compact-primitive.js';

/**
 * Applies a transform matrix to every {@link Primitive} in the given {@link Mesh}.
 *
 * Method:
 * - TODO
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
 */
export function transformMesh(mesh: Mesh, matrix: mat4): void {
	for (const prim of mesh.listPrimitives()) {
		compactPrimitive(prim);
		transformPrimitive(prim, matrix);
	}
}
