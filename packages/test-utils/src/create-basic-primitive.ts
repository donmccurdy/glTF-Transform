import { type Document, Primitive, type vec3 } from '@gltf-transform/core';

const { LINE_STRIP, LINE_LOOP, TRIANGLE_STRIP, TRIANGLE_FAN } = Primitive.Mode;

const DEFAULT_TRANSLATION: vec3 = [0, 0, 0];
const DEFAULT_SCALE: vec3 = [1, 1, 1];

/**
 * Creates a series of 'primCount' lines, forming an open-sided N-gon.
 *
 * Reference: https://glasnost.itcarlow.ie/~powerk/opengl/primitives/primitives.htm
 */
export function createLineStripPrim(
	document: Document,
	primCount = 8,
	translation = DEFAULT_TRANSLATION,
	scale = DEFAULT_SCALE,
): Primitive {
	const vertexCount = primCount + 1;
	const positionArray = new Float32Array(vertexCount * 3);
	for (let i = 0; i < positionArray.length / 3; i++) {
		positionArray[i * 3] = translation[0] + Math.cos((i / vertexCount) * 2 * Math.PI) * scale[0];
		positionArray[i * 3 + 1] = translation[1] + Math.sin((i / vertexCount) * 2 * Math.PI) * scale[1];
		positionArray[i * 3 + 2] = translation[2];
	}

	const buffer = document.getRoot().listBuffers()[0] || document.createBuffer();
	const position = document.createAccessor().setType('VEC3').setArray(positionArray).setBuffer(buffer);
	const indices = document
		.createAccessor()
		.setArray(new Uint16Array(vertexCount).map((_, i) => i))
		.setBuffer(buffer);

	return document.createPrimitive().setMode(LINE_STRIP).setAttribute('POSITION', position).setIndices(indices);
}

/**
 * Creates a series of 'primCount' lines, forming a closed N-gon.
 *
 * Reference: https://glasnost.itcarlow.ie/~powerk/opengl/primitives/primitives.htm
 */
export function createLineLoopPrim(
	document: Document,
	primCount = 8,
	translation = DEFAULT_TRANSLATION,
	scale = DEFAULT_SCALE,
): Primitive {
	return createLineStripPrim(document, primCount, translation, scale).setMode(LINE_LOOP);
}

/**
 * Creates an position vertex attribute array, containing `primCount` triangles,
 * arranged as a 1xN grid in the XZ plane.
 *
 * Reference: https://en.wikipedia.org/wiki/Triangle_strip
 */
export function createTriangleStripPrim(
	document: Document,
	primCount = 8,
	translation = DEFAULT_TRANSLATION,
	scale = DEFAULT_SCALE,
): Primitive {
	const vertexCount = primCount + 2;
	const positionArray = new Float32Array(vertexCount * 3);
	for (let i = 0; i < positionArray.length / 3; i++) {
		positionArray[i * 3] = translation[0] + (i % 2) * scale[0];
		positionArray[i * 3 + 1] = translation[1] + Math.floor(i / 2) * scale[1];
		positionArray[i * 3 + 2] = translation[2];
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
 *
 * Reference: https://en.wikipedia.org/wiki/Triangle_fan
 */
export function createTriangleFanPrim(
	document: Document,
	primCount = 8,
	translation = DEFAULT_TRANSLATION,
	scale = DEFAULT_SCALE,
): Primitive {
	const vertexCount = primCount + 2;
	const positionArray = new Float32Array(vertexCount * 3);
	for (let i = 0; i < positionArray.length / 3; i++) {
		positionArray[i * 3] = translation[0] + Math.cos((i / vertexCount) * 2 * Math.PI) * scale[0];
		positionArray[i * 3 + 1] = translation[1] + Math.sin((i / vertexCount) * 2 * Math.PI) * scale[1];
		positionArray[i * 3 + 2] = translation[2];
	}

	const buffer = document.getRoot().listBuffers()[0] || document.createBuffer();
	const position = document.createAccessor().setType('VEC3').setArray(positionArray).setBuffer(buffer);
	const indices = document
		.createAccessor()
		.setArray(new Uint16Array(vertexCount).map((_, i) => i))
		.setBuffer(buffer);

	return document.createPrimitive().setMode(TRIANGLE_FAN).setAttribute('POSITION', position).setIndices(indices);
}
