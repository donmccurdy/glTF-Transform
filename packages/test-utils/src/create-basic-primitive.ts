import { Document, Primitive } from '@gltf-transform/core';

const { POINTS, LINES, LINE_STRIP, LINE_LOOP, TRIANGLES, TRIANGLE_STRIP, TRIANGLE_FAN } = Primitive.Mode;

export function createLineStripPrim(document: Document): Primitive {
	throw new Error('not implemented');
}

export function createLineLoopPrim(document: Document): Primitive {
	throw new Error('not implemented');
}

/**
 * Creates an position vertex attribute array, containing `primCount` triangles,
 * arranged as a 1xN grid in the XZ plane.
 */
export function createTriangleStripPrim(document: Document, primCount = 8): Primitive {
	const vertexCount = primCount + 2;
	const positionArray = new Float32Array(vertexCount * 3);
	for (let i = 0; i < positionArray.length; i += 3) {
		// TODO(test)
		positionArray[i] = i % 2;
		positionArray[i + 1] = 0;
		positionArray[i + 2] = Math.floor(i / 2);
	}

	const buffer = document.getRoot().listBuffers()[0] || document.createBuffer();
	const position = document.createAccessor().setType('VEC3').setArray(positionArray).setBuffer(buffer);
	const indices = document
		.createAccessor()
		.setArray(new Uint16Array(vertexCount).map((_, i) => i))
		.setBuffer(buffer);

	return document.createPrimitive().setMode(TRIANGLE_STRIP).setAttribute('POSITION', position).setIndices(indices);
}

/**
 * Creates a position vertex attribute array, containing `primCount` triangles,
 * arranged as a circular fan in the XZ plane.
 */
export function createTriangleFanPrim(document: Document, primCount = 8): Primitive {
	const vertexCount = primCount + 2;
	const positionArray = new Float32Array(vertexCount * 3);
	for (let i = 0; i < positionArray.length; i += 3) {
		// TODO(test)
		positionArray[i] = Math.cos((i / vertexCount) * 2 * Math.PI);
		positionArray[i + 1] = 0;
		positionArray[i + 2] = Math.sin((i / vertexCount) * 2 * Math.PI);
	}

	const buffer = document.getRoot().listBuffers()[0] || document.createBuffer();
	const position = document.createAccessor().setType('VEC3').setArray(positionArray).setBuffer(buffer);
	const indices = document
		.createAccessor()
		.setArray(new Uint16Array(vertexCount).map((_, i) => i))
		.setBuffer(buffer);

	return document.createPrimitive().setMode(TRIANGLE_FAN).setAttribute('POSITION', position).setIndices(indices);
}
