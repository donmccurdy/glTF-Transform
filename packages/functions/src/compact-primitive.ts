import { Accessor, Document, Primitive, TypedArray, TypedArrayConstructor } from '@gltf-transform/core';
import { createIndicesEmpty, deepListAttributes, shallowCloneAccessor } from './utils.js';
import { VertexCountMethod, getPrimitiveVertexCount } from './get-vertex-count.js';

/** @hidden */
export function compactPrimitive(prim: Primitive, remap: TypedArray, dstVertexCount: number): Primitive {
	const document = Document.fromGraph(prim.getGraph())!;

	// Remap indices.

	const srcIndices = prim.getIndices();
	const srcIndicesArray = srcIndices ? srcIndices.getArray() : null;
	const srcIndicesCount = getPrimitiveVertexCount(prim, VertexCountMethod.RENDER);

	const dstIndices = document.createAccessor();
	const dstIndicesCount = srcIndicesCount; // primitive count does not change.
	const dstIndicesArray = createIndicesEmpty(dstIndicesCount, dstVertexCount);

	for (let i = 0; i < dstIndicesCount; i++) {
		dstIndicesArray[i] = remap[srcIndicesArray ? srcIndicesArray[i] : i];
	}

	prim.setIndices(dstIndices.setArray(dstIndicesArray));

	// Remap vertices.

	const srcAttributesPrev = deepListAttributes(prim);

	for (const srcAttribute of prim.listAttributes()) {
		const dstAttribute = shallowCloneAccessor(document, srcAttribute);
		compactAttribute(srcAttribute, srcIndices, remap, dstAttribute, dstVertexCount);
		prim.swap(srcAttribute, dstAttribute);
	}
	for (const target of prim.listTargets()) {
		for (const srcAttribute of target.listAttributes()) {
			const dstAttribute = shallowCloneAccessor(document, srcAttribute);
			compactAttribute(srcAttribute, srcIndices, remap, dstAttribute, dstVertexCount);
			target.swap(srcAttribute, dstAttribute);
		}
	}

	// Clean up accessors.

	if (srcIndices && srcIndices.listParents().length === 1) srcIndices.dispose();
	for (const srcAttribute of srcAttributesPrev) {
		if (srcAttribute.listParents().length === 1) srcAttribute.dispose();
	}

	return prim;
}

/**
 * Copies srcAttribute to dstAttribute, using the given indices and remap (srcIndex -> dstIndex).
 * Any existing array in dstAttribute is replaced. Vertices not used by the index are eliminated,
 * leaving a compact attribute.
 * @hidden
 */
export function compactAttribute(
	srcAttribute: Accessor,
	srcIndices: Accessor | null,
	remap: TypedArray,
	dstAttribute: Accessor,
	dstVertexCount: number,
): Accessor {
	const elementSize = srcAttribute.getElementSize();
	const srcArray = srcAttribute.getArray()!;
	const srcIndicesArray = srcIndices ? srcIndices.getArray() : null;
	const srcIndicesCount = srcIndices ? srcIndices.getCount() : srcAttribute.getCount();
	const dstArray = new (srcArray.constructor as TypedArrayConstructor)(dstVertexCount * elementSize);
	const dstDone = new Uint8Array(dstVertexCount);

	for (let i = 0; i < srcIndicesCount; i++) {
		const srcIndex = srcIndicesArray ? srcIndicesArray[i] : i;
		const dstIndex = remap[srcIndex];
		if (dstDone[dstIndex]) continue;

		for (let j = 0; j < elementSize; j++) {
			dstArray[dstIndex * elementSize + j] = srcArray[srcIndex * elementSize + j];
		}

		dstDone[dstIndex] = 1;
	}

	return dstAttribute.setArray(dstArray);
}
