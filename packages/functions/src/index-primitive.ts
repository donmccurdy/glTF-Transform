import { Primitive, Document } from '@gltf-transform/core';
import { createIndices } from './utils.js';

/**
 * Adds indices to an un-indexed {@link Primitive}, with no other changes to
 * vertex buffers. To merge identical vertices, use {@link weldPrimitive}
 * instead.
 *
 * Example:
 *
 * ```javascript
 * import { indexPrimitive } from '@gltf-transform/functions';
 *
 * for (const mesh of document.getRoot().listMeshes()) {
 * 	for (const prim of mesh.listPrimitives()) {
 * 		if (!prim.getIndices()) {
 * 			indexPrimitive(prim);
 * 		}
 * 	}
 * }
 * ```
 */
export function indexPrimitive(prim: Primitive): void {
	if (prim.getIndices()) return;

	const document = Document.fromGraph(prim.getGraph())!;
	const position = prim.getAttribute('POSITION')!;
	const indices = document
		.createAccessor()
		.setArray(createIndices(position.getCount()))
		.setBuffer(position.getBuffer());

	prim.setIndices(indices);
}
