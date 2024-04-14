import { ComponentTypeToTypedArray, Document, Primitive } from '@gltf-transform/core';
import { getGLPrimitiveCount, shallowCloneAccessor } from './utils.js';
import { weldPrimitive } from './weld.js';

const { LINES, LINE_STRIP, LINE_LOOP, TRIANGLES, TRIANGLE_STRIP, TRIANGLE_FAN } = Primitive.Mode;

/**
 * Converts a LINE_STRIP or LINE_LOOP {@link Primitive} to LINES, which is
 * more widely supported. Any other topology given as input (points or
 * triangles) will throw an error.
 *
 * Example:
 *
 * ```javascript
 * import { convertPrimitiveToLines } from '@gltf-transform/functions';
 *
 * console.log(prim.getMode()); // 2 (LINE_LOOP)
 * convertPrimitiveToLines(prim);
 * console.log(prim.getMode()); // 1 (LINES)
 * ```
 */
export function convertPrimitiveToLines(prim: Primitive): void {
	const graph = prim.getGraph();
	const document = Document.fromGraph(graph)!;

	// Ensure indexed primitive.
	if (!prim.getIndices()) {
		weldPrimitive(prim);
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
		// https://glasnost.itcarlow.ie/~powerk/opengl/primitives/primitives.htm
		for (let i = 0; i < dstGLPrimitiveCount; i++) {
			dstIndicesArray[i * 2] = srcIndicesArray[i];
			dstIndicesArray[i * 2 + 1] = srcIndicesArray[i + 1];
		}
	} else if (srcMode === LINE_LOOP) {
		// https://glasnost.itcarlow.ie/~powerk/opengl/primitives/primitives.htm
		for (let i = 0; i < dstGLPrimitiveCount; i++) {
			if (i < dstGLPrimitiveCount - 1) {
				dstIndicesArray[i * 2] = srcIndicesArray[i];
				dstIndicesArray[i * 2 + 1] = srcIndicesArray[i + 1];
			} else {
				dstIndicesArray[i * 2] = srcIndicesArray[i];
				dstIndicesArray[i * 2 + 1] = srcIndicesArray[0];
			}
		}
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

/**
 * Converts a TRIANGLE_STRIP or TRIANGLE_LOOP {@link Primitive} to TRIANGLES,
 * which is more widely supported. Any other topology given as input (points or
 * lines) will throw an error.
 *
 * Example:
 *
 * ```javascript
 * import { convertPrimitiveToTriangles } from '@gltf-transform/functions';
 *
 * console.log(prim.getMode()); // 5 (TRIANGLE_STRIP)
 * convertPrimitiveToTriangles(prim);
 * console.log(prim.getMode()); // 4 (TRIANGLES)
 * ```
 */
export function convertPrimitiveToTriangles(prim: Primitive): void {
	const graph = prim.getGraph();
	const document = Document.fromGraph(graph)!;

	// Ensure indexed primitive.
	if (!prim.getIndices()) {
		weldPrimitive(prim);
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
