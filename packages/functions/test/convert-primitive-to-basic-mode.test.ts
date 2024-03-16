import test from 'ava';
import { Document, GLTF, NodeIO, Primitive } from '@gltf-transform/core';
import { convertPrimitiveToBasicMode } from '@gltf-transform/functions';
import { logger, createPlatformIO } from '@gltf-transform/test-utils';

const { POINTS, LINES, LINE_STRIP, LINE_LOOP, TRIANGLES, TRIANGLE_STRIP, TRIANGLE_FAN } = Primitive.Mode;

// TODO(impl)
test.skip('line-strip to lines', async (t) => {
	const document = new Document().setLogger(logger);
	const prim = createLineStripPrim(document);

	convertPrimitiveToBasicMode(prim);

	t.is(prim.getMode(), LINES, 'mode');
});

// TODO(impl)
test.skip('line-loop to lines', async (t) => {
	const document = new Document().setLogger(logger);
	const prim = createLineLoopPrim(document);

	convertPrimitiveToBasicMode(prim);

	t.is(prim.getMode(), LINES, 'mode');
});

test('triangle-strip to triangles', async (t) => {
	const document = new Document().setLogger(logger);
	const prim = createTriangleStripPrim(document);
	const mesh = document.createMesh().addPrimitive(prim);
	const node = document.createNode().setMesh(mesh);
	document.createScene().addChild(node);

	const io = (await createPlatformIO()) as NodeIO;
	await io.write('triangle-strip.glb', document);

	convertPrimitiveToBasicMode(prim);

	t.is(prim.getMode(), TRIANGLES, 'mode');
});

test('triangle-fan to triangles', async (t) => {
	const document = new Document().setLogger(logger);
	const prim = createTriangleFanPrim(document);
	const mesh = document.createMesh().addPrimitive(prim);
	const node = document.createNode().setMesh(mesh);
	document.createScene().addChild(node);

	const io = (await createPlatformIO()) as NodeIO;
	await io.write('triangle-fan.glb', document);

	convertPrimitiveToBasicMode(prim);

	t.is(prim.getMode(), TRIANGLES, 'mode');
});

function createLineStripPrim(document: Document): Primitive {
	throw new Error('not implemented');
}

function createLineLoopPrim(document: Document): Primitive {
	throw new Error('not implemented');
}

/**
 * Creates an position vertex attribute array, containing `primCount` triangles,
 * arranged as a 1xN grid in the XZ plane.
 */
function createTriangleStripPrim(document: Document, primCount = 8): Primitive {
	const vertexCount = primCount + 2;
	const positionArray = new Float32Array(vertexCount * 3);
	for (let i = 0; i < positionArray.length; i += 3) {
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
function createTriangleFanPrim(document: Document, primCount = 8): Primitive {
	const vertexCount = primCount + 2;
	const positionArray = new Float32Array(vertexCount * 3);
	for (let i = 0; i < positionArray.length; i += 3) {
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
