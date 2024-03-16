import { ComponentTypeToTypedArray, Document, Primitive } from '@gltf-transform/core';
import { BASIC_MODE_MAPPING, getGLPrimitiveCount, shallowCloneAccessor } from './utils.js';
import { weldPrimitive } from './weld.js';

const { POINTS, LINES, LINE_STRIP, LINE_LOOP, TRIANGLES, TRIANGLE_STRIP, TRIANGLE_FAN } = Primitive.Mode;

export function convertPrimitiveToBasicMode(prim: Primitive): void {
	const graph = prim.getGraph();
	const document = Document.fromGraph(graph)!;

	const srcMode = prim.getMode();
	if (srcMode === POINTS || srcMode === LINES || srcMode === TRIANGLES) {
		return;
	}

	const dstMode = BASIC_MODE_MAPPING[srcMode];
	if (dstMode === undefined) {
		throw new Error(`Unexpected mode: ${srcMode}`);
	}

	// Ensure indexed primitive.
	if (!prim.getIndices()) {
		weldPrimitive(prim, { tolerance: 0 });
	}

	// Allocate indices new GL primitives.
	const srcIndices = prim.getIndices()!;
	const srcIndicesArray = srcIndices.getArray()!;
	const dstGLPrimitiveCount = getGLPrimitiveCount(prim);
	const IndicesArray = ComponentTypeToTypedArray[srcIndices.getComponentType()];
	const dstIndicesArray = new IndicesArray(dstGLPrimitiveCount * (dstMode === LINES ? 2 : 3));

	// Generate GL primitives.
	if (srcMode === LINE_STRIP) {
		throw new Error('not implemented');
	} else if (srcMode === LINE_LOOP) {
		throw new Error('not implemented');
	} else if (srcMode === TRIANGLE_STRIP) {
		// TODO(test)
		for (let i = 0, il = srcIndicesArray.length; i < il - 2; i++) {
			if (i % 2) {
				dstIndicesArray[i * 3] = srcIndicesArray[i * 3];
				dstIndicesArray[i * 3 + 2] = srcIndicesArray[i * 3 + 2];
				dstIndicesArray[i * 3 + 1] = srcIndicesArray[i * 3 + 1];
			} else {
				dstIndicesArray[i * 3] = srcIndicesArray[i * 3];
				dstIndicesArray[i * 3 + 1] = srcIndicesArray[i * 3 + 1];
				dstIndicesArray[i * 3 + 2] = srcIndicesArray[i * 3 + 2];
			}
		}
	} else if (srcMode === TRIANGLE_FAN) {
		// TODO(test)
		for (let i = 1; i < dstGLPrimitiveCount - 1; i++) {
			dstIndicesArray[i * 3] = srcIndicesArray[0];
			dstIndicesArray[i * 3 + 1] = srcIndicesArray[i];
			dstIndicesArray[i * 3 + 2] = srcIndicesArray[i + 1];
		}
	}

	// Update prim mode and indices.
	prim.setMode(dstMode);
	const root = document.getRoot();
	if (srcIndices.listParents().some((parent) => parent !== root && parent !== prim)) {
		prim.setIndices(shallowCloneAccessor(document, srcIndices).setArray(dstIndicesArray));
	} else {
		srcIndices.setArray(dstIndicesArray);
	}
}
