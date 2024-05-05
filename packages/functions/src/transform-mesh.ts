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
	// If primitives or morph targets are shared by other meshes, detach them.
	for (const srcPrim of mesh.listPrimitives()) {
		const dstPrim = shallowClonePrimitive(srcPrim, mesh);
		if (srcPrim !== dstPrim) {
			mesh.removePrimitive(srcPrim).addPrimitive(dstPrim);
		}
	}

	// Isolate vertex streams, remove unused vertices, and transform.
	for (const prim of mesh.listPrimitives()) {
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
function shallowClonePrimitive(prim: Primitive, parentMesh: Mesh): Primitive {
	const isSharedPrimitive = prim.listParents().some((parent) => parent instanceof Mesh && parent !== parentMesh);
	if (isSharedPrimitive) {
		prim = prim.clone();
	}

	for (const target of prim.listTargets()) {
		const isSharedTarget = target.listParents().some((parent) => parent instanceof Primitive && parent !== prim);
		if (isSharedTarget) {
			prim.removeTarget(target).addTarget(target.clone());
		}
	}

	return prim;
}
