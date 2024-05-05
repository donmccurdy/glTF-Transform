import { mat4, Mesh, Primitive } from '@gltf-transform/core';
import { transformPrimitive } from './transform-primitive.js';
import { compactPrimitive } from './compact-primitive.js';

/**
 * Applies a transform matrix to every {@link Primitive} in the given {@link Mesh}.
 *
 * For every Primitive in the Mesh, the operation first applies
 * {@link compactPrimitive} to isolate vertex streams, then calls
 * {@link transformPrimitive}. Transformed Mesh will no longer share vertex
 * attributes with any other Meshes — attributes are cloned before
 * transformation.
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
		shallowClonePrimitive(prim, mesh);
		compactPrimitive(prim);
		transformPrimitive(prim, matrix);
	}
}

/**
 * Conditionally clones a {@link Primitive} and its
 * {@link PrimitiveTarget PrimitiveTargets}, if any are shared with other
 * parents. If nothing is shared, nothing is cloned. Accessors and materials
 * are not cloned.
 *
 * @hidden
 * @internal
 */
function shallowClonePrimitive(prim: Primitive, parentMesh: Mesh): void {
	for (const parent of prim.listParents()) {
		if (parent instanceof Mesh && parent !== parentMesh) {
			prim = prim.clone();
			break;
		}
	}

	for (const target of prim.listTargets()) {
		for (const parent of target.listParents()) {
			if (parent instanceof Primitive && parent !== prim) {
				prim.swap(target, target.clone());
			}
		}
	}
}
