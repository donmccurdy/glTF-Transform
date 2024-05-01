import { Accessor, Document, Primitive, Transform, TypedArrayConstructor } from '@gltf-transform/core';
import { createTransform, formatDeltaOp, shallowCloneAccessor } from './utils.js';

const NAME = 'unweld';

/** Options for the {@link unweld} function. */
export interface UnweldOptions {}

const UNWELD_DEFAULTS: UnweldOptions = {};

/**
 * De-index {@link Primitive}s, disconnecting any shared vertices. This operation will generally
 * increase the number of vertices in a mesh, but may be helpful for some geometry operations or
 * for creating hard edges.
 *
 * No options are currently implemented for this function.
 *
 * @category Transforms
 */
export function unweld(_options: UnweldOptions = UNWELD_DEFAULTS): Transform {
	return createTransform(NAME, (doc: Document): void => {
		const logger = doc.getLogger();
		const visited = new Map<Accessor, Map<Accessor, Accessor>>();

		for (const mesh of doc.getRoot().listMeshes()) {
			for (const prim of mesh.listPrimitives()) {
				unweldPrimitive(prim, visited);
			}
		}

		logger.debug(`${NAME}: Complete.`);
	});
}

/**
 * @hidden
 * @internal
 */
export function unweldPrimitive(prim: Primitive, visited = new Map<Accessor, Map<Accessor, Accessor>>()): void {
	const indices = prim.getIndices();
	if (!indices) return;

	const graph = prim.getGraph();
	const document = Document.fromGraph(graph)!;
	const logger = document.getLogger();

	const srcVertexCount = prim.getAttribute('POSITION')!.getCount();

	// Vertex attributes.
	for (const srcAttribute of prim.listAttributes()) {
		prim.swap(srcAttribute, unweldAttribute(document, srcAttribute, indices, visited));

		// Clean up.
		if (srcAttribute.listParents().length === 1) srcAttribute.dispose();
	}

	// Morph target vertex attributes.
	for (const target of prim.listTargets()) {
		for (const srcAttribute of target.listAttributes()) {
			target.swap(srcAttribute, unweldAttribute(document, srcAttribute, indices, visited));

			// Clean up.
			if (srcAttribute.listParents().length === 1) srcAttribute.dispose();
		}
	}

	const dstVertexCount = prim.getAttribute('POSITION')!.getCount();
	logger.debug(`${NAME}: ${formatDeltaOp(srcVertexCount, dstVertexCount)} vertices.`);

	// Clean up.
	prim.setIndices(null);
	if (indices.listParents().length === 1) indices.dispose();
}

function unweldAttribute(
	document: Document,
	srcAttribute: Accessor,
	indices: Accessor,
	visited: Map<Accessor, Map<Accessor, Accessor>>,
): Accessor {
	if (visited.has(srcAttribute) && visited.get(srcAttribute)!.has(indices)) {
		return visited.get(srcAttribute)!.get(indices)!;
	}

	const srcArray = srcAttribute.getArray()!;
	const TypedArray = srcArray.constructor as TypedArrayConstructor;
	const dstArray = new TypedArray(indices.getCount() * srcAttribute.getElementSize());

	const indicesArray = indices.getArray()!;
	const elementSize = srcAttribute.getElementSize();
	for (let i = 0, il = indices.getCount(); i < il; i++) {
		for (let j = 0; j < elementSize; j++) {
			dstArray[i * elementSize + j] = srcArray[indicesArray[i] * elementSize + j];
		}
	}

	if (!visited.has(srcAttribute)) visited.set(srcAttribute, new Map());
	const dstAttribute = shallowCloneAccessor(document, srcAttribute).setArray(dstArray);
	visited.get(srcAttribute)!.set(indices, dstAttribute);

	return dstAttribute;
}
