import { Accessor, Document, Primitive, TypedArray, TypedArrayConstructor } from '@gltf-transform/core';
import { createIndicesEmpty, deepListAttributes, shallowCloneAccessor } from './utils.js';
import { cleanPrimitive } from './clean-primitive.js';

// TODO(v4): This file is going through some things. Consider compactPrimitive instead.

/** @hidden */
export function remapPrimitive(prim: Primitive, remap: TypedArray, dstVertexCount: number): Primitive {
	const document = Document.fromGraph(prim.getGraph())!;

	// Remap indices.

	const srcVertexCount = prim.getAttribute('POSITION')!.getCount();
	const srcIndices = prim.getIndices();
	const srcIndicesArray = srcIndices ? srcIndices.getArray() : null;
	const dstIndices = document.createAccessor();
	const dstIndicesCount = srcIndices ? srcIndices.getCount() : srcVertexCount; // primitive count does not change.
	const dstIndicesArray = createIndicesEmpty(dstIndicesCount, dstVertexCount);
	for (let i = 0; i < dstIndicesCount; i++) {
		dstIndicesArray[i] = remap[srcIndicesArray ? srcIndicesArray[i] : i];
	}
	prim.setIndices(dstIndices.setArray(dstIndicesArray));

	// Remap vertices.

	const srcAttributesPrev = deepListAttributes(prim);

	// 🛑 lots of accessor churn... could we have compacted the mesh first?
	// skip compacting and weld by vertex stream?
	// console.time('remapAttributes');
	// console.log(`srcVertexCount=${srcVertexCount} -> dstVertexCount=${dstVertexCount}, remapCount=${remap.length}`);

	// 🛑 so we need the source array as input ... but we're using it as dstArray ...
	// ... really need to rethink this API.
	for (const srcAttribute of prim.listAttributes()) {
		const elementSize = srcAttribute.getElementSize();
		const srcArray = srcAttribute.getArray()!;
		const dstArray = new (srcArray.constructor as TypedArrayConstructor)(dstVertexCount * elementSize);
		const dstAttribute = shallowCloneAccessor(document, srcAttribute).setArray(dstArray);
		prim.swap(srcAttribute, remapAttribute(srcAttribute, remap, dstVertexCount, dstAttribute));
	}
	for (const target of prim.listTargets()) {
		for (const srcAttribute of target.listAttributes()) {
			const elementSize = srcAttribute.getElementSize();
			const srcArray = srcAttribute.getArray()!;
			const dstArray = new (srcArray.constructor as TypedArrayConstructor)(dstVertexCount * elementSize);
			const dstAttribute = shallowCloneAccessor(document, srcAttribute).setArray(dstArray);
			target.swap(srcAttribute, remapAttribute(srcAttribute, remap, dstVertexCount, dstAttribute));
		}
	}
	// console.timeEnd('remapAttributes');

	// Clean up accessors.

	// 🛑 could benefit from a faster 'isUsed'. this lists all 10000 primitives!
	// ... perhaps Property#someParent / Property#everyParent?
	// ... JK though, it's mostly the remap above. 😞
	// console.time('cleanup');
	if (srcIndices && srcIndices.listParents().length === 1) srcIndices.dispose();
	for (const srcAttribute of srcAttributesPrev) {
		if (srcAttribute.listParents().length === 1) srcAttribute.dispose();
	}
	// console.timeEnd('cleanup');

	// Clean up degenerate topology.

	cleanPrimitive(prim); // 🛑 untyped array allocation

	return prim;
}

/** @hidden */
export function remapAttribute(
	srcAttribute: Accessor,
	remap: TypedArray,
	dstCount: number,
	dstAttribute = srcAttribute,
): Accessor {
	const elementSize = srcAttribute.getElementSize();
	const srcCount = srcAttribute.getCount();
	const srcArray = srcAttribute.getArray()!;
	// prettier-ignore
	const dstArray = dstAttribute === srcAttribute
		? srcArray.slice(0, dstCount * elementSize)
		: dstAttribute.getArray()!;
	const done = new Uint8Array(dstCount);

	for (let srcIndex = 0; srcIndex < srcCount; srcIndex++) {
		const dstIndex = remap[srcIndex];
		if (done[dstIndex]) continue;
		for (let j = 0; j < elementSize; j++) {
			dstArray[dstIndex * elementSize + j] = srcArray[srcIndex * elementSize + j];
		}
		done[dstIndex] = 1;
	}

	return dstAttribute.setArray(dstArray);
}

/** @hidden */
export function remapIndices(
	srcIndices: Accessor,
	remap: TypedArray,
	dstOffset: number,
	dstCount: number,
	dstIndices = srcIndices,
): Accessor {
	const srcCount = srcIndices.getCount();
	const srcArray = srcIndices.getArray()!;
	const dstArray = dstIndices === srcIndices ? srcArray.slice(0, dstCount) : dstIndices.getArray()!;

	for (let i = 0; i < srcCount; i++) {
		const srcIndex = srcArray[i];
		const dstIndex = remap[srcIndex];
		dstArray[dstOffset + i] = dstIndex;
	}

	return dstIndices.setArray(dstArray);
}
