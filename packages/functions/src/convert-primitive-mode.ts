import { ComponentTypeToTypedArray, Document, Primitive } from '@gltf-transform/core';
import { getGLPrimitiveCount, shallowCloneAccessor } from './utils.js';
import { weldPrimitive } from './weld.js';

const { LINES, LINE_STRIP, LINE_LOOP, TRIANGLES, TRIANGLE_STRIP, TRIANGLE_FAN } = Primitive.Mode;

export function convertPrimitiveToLines(prim: Primitive): void {
	const graph = prim.getGraph();
	const document = Document.fromGraph(graph)!;

	// Ensure indexed primitive.
	if (!prim.getIndices()) {
		weldPrimitive(prim, { tolerance: 0 });
	}

	// Allocate indices new GL primitives.
	const srcIndices = prim.getIndices()!;
	const srcIndicesArray = srcIndices.getArray()!;
	const dstGLPrimitiveCount = getGLPrimitiveCount(prim);
	const IndicesArray = ComponentTypeToTypedArray[srcIndices.getComponentType()];
	const dstIndicesArray = new IndicesArray(dstGLPrimitiveCount * 2);

	// Generate GL primitives.
	const srcMode = prim.getMode();
	if (srcMode === LINE_STRIP) {
		throw new Error('not implemented');
	} else if (srcMode === LINE_LOOP) {
		throw new Error('not implemented');
	} else {
		throw new Error('Only LINE_STRIP and LINE_LOOP may be converted to LINES.');
	}

	// Update prim mode and indices.
	prim.setMode(LINES);
	const root = document.getRoot();
	if (srcIndices.listParents().some((parent) => parent !== root && parent !== prim)) {
		prim.setIndices(shallowCloneAccessor(document, srcIndices).setArray(dstIndicesArray));
	} else {
		srcIndices.setArray(dstIndicesArray);
	}
}

export function convertPrimitiveToTriangles(prim: Primitive): void {
	const graph = prim.getGraph();
	const document = Document.fromGraph(graph)!;

	// Ensure indexed primitive.
	if (!prim.getIndices()) {
		weldPrimitive(prim, { tolerance: 0 });
	}

	// Allocate indices new GL primitives.
	const srcIndices = prim.getIndices()!;
	const srcIndicesArray = srcIndices.getArray()!;
	const dstGLPrimitiveCount = getGLPrimitiveCount(prim);
	const IndicesArray = ComponentTypeToTypedArray[srcIndices.getComponentType()];
	const dstIndicesArray = new IndicesArray(dstGLPrimitiveCount * 3);

	// Generate GL primitives.
	const srcMode = prim.getMode();
	if (srcMode === TRIANGLE_STRIP) {
		// https://en.wikipedia.org/wiki/Triangle_strip
		for (let i = 0, il = srcIndicesArray.length; i < il - 2; i++) {
			if (i % 2) {
				dstIndicesArray[i * 3] = srcIndicesArray[i + 1];
				dstIndicesArray[i * 3 + 1] = srcIndicesArray[i];
				dstIndicesArray[i * 3 + 2] = srcIndicesArray[i + 2];
			} else {
				dstIndicesArray[i * 3] = srcIndicesArray[i];
				dstIndicesArray[i * 3 + 1] = srcIndicesArray[i + 1];
				dstIndicesArray[i * 3 + 2] = srcIndicesArray[i + 2];
			}
		}
	} else if (srcMode === TRIANGLE_FAN) {
		// https://en.wikipedia.org/wiki/Triangle_fan
		for (let i = 0; i < dstGLPrimitiveCount; i++) {
			dstIndicesArray[i * 3] = srcIndicesArray[0];
			dstIndicesArray[i * 3 + 1] = srcIndicesArray[i + 1];
			dstIndicesArray[i * 3 + 2] = srcIndicesArray[i + 2];
		}
	} else {
		throw new Error('Only TRIANGLE_STRIP and TRIANGLE_FAN may be converted to TRIANGLES.');
	}

	// Update prim mode and indices.
	prim.setMode(TRIANGLES);
	const root = document.getRoot();
	if (srcIndices.listParents().some((parent) => parent !== root && parent !== prim)) {
		prim.setIndices(shallowCloneAccessor(document, srcIndices).setArray(dstIndicesArray));
	} else {
		srcIndices.setArray(dstIndicesArray);
	}
}
