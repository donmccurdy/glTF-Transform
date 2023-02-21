import { mat4, Accessor, Primitive, Mesh, PropertyType, PrimitiveTarget } from '@gltf-transform/core';
import { transformPrimitive } from './transform-primitive.js';
import { deepListAttributes } from './utils.js';

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
