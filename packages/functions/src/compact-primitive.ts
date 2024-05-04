import { Accessor, Document, Primitive, TypedArray, TypedArrayConstructor } from '@gltf-transform/core';
import { createIndices, createIndicesEmpty, deepListAttributes, shallowCloneAccessor } from './utils.js';
import { VertexCountMethod, getPrimitiveVertexCount } from './get-vertex-count.js';
import { EMPTY_U32 } from './hash-table.js';

/**
 * TODO - document and export this if it's needed for transformPrimitive.
 * @hidden
 */
export function compactPrimitive(prim: Primitive, remap?: TypedArray, dstVertexCount?: number): Primitive {
	const document = Document.fromGraph(prim.getGraph())!;

	if (!remap || !dstVertexCount) {
		[remap, dstVertexCount] = createCompactPlan(prim);
	}

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

	if (srcIndices && srcIndices.listParents().length === 1) {
		srcIndices.dispose();
	}
	for (const srcAttribute of srcAttributesPrev) {
		if (srcAttribute.listParents().length === 1) {
			srcAttribute.dispose();
		}
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

/**
 * Creates a 'remap' and 'dstVertexCount' plan for indexed primitives,
 * such that they can be rewritten with {@link compactPrimitive} removing
 * any non-rendered vertices.
 * @hidden
 * @internal
 */
function createCompactPlan(prim: Primitive): [Uint32Array, number] {
	const srcVertexCount = getPrimitiveVertexCount(prim, VertexCountMethod.UPLOAD);

	const indices = prim.getIndices();
	const indicesArray = indices ? indices.getArray() : null;
	if (!indices || !indicesArray) {
		return [createIndices(srcVertexCount, 1_000_000) as Uint32Array, srcVertexCount];
	}

	const remap = new Uint32Array(srcVertexCount).fill(EMPTY_U32);

	let dstVertexCount = 0;

	for (let i = 0; i < indicesArray.length; i++) {
		const srcIndex = indicesArray[i];
		if (remap[srcIndex] === EMPTY_U32) {
			remap[srcIndex] = dstVertexCount++;
		}
	}

	return [remap, dstVertexCount];
}
