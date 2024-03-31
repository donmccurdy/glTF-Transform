import test from 'ava';
import { Document, Primitive } from '@gltf-transform/core';
import { convertPrimitiveToLines, convertPrimitiveToTriangles } from '@gltf-transform/functions';
import {
	logger,
	createLineStripPrim,
	createLineLoopPrim,
	createTriangleStripPrim,
	createTriangleFanPrim,
} from '@gltf-transform/test-utils';

const { POINTS, LINES, LINE_STRIP, LINE_LOOP, TRIANGLES, TRIANGLE_STRIP, TRIANGLE_FAN } = Primitive.Mode;

test('line-strip to lines', async (t) => {
	const document = new Document().setLogger(logger);
	const prim = createLineStripPrim(document);
	const mesh = document.createMesh().addPrimitive(prim);
	const node = document.createNode().setMesh(mesh);
	document.createScene().addChild(node);

	convertPrimitiveToLines(prim);

	t.is(prim.getMode(), LINES, 'mode');
	t.deepEqual(
		Array.from(prim.getIndices().getArray()),
		// prettier-ignore
		[
			0, 1,
			1, 2,
			2, 3,
			3, 4,
			4, 5,
			5, 6,
			6, 7,
			7, 8,
		],
		'indices',
	);
});

test('line-loop to lines', async (t) => {
	const document = new Document().setLogger(logger);
	const prim = createLineLoopPrim(document);
	const mesh = document.createMesh().addPrimitive(prim);
	const node = document.createNode().setMesh(mesh);
	document.createScene().addChild(node);

	convertPrimitiveToLines(prim);

	t.is(prim.getMode(), LINES, 'mode');
	t.deepEqual(
		Array.from(prim.getIndices().getArray()),
		// prettier-ignore
		[
			0, 1,
			1, 2,
			2, 3,
			3, 4,
			4, 5,
			5, 6,
			6, 7,
			7, 8,
			8, 0
		],
		'indices',
	);
});

test('triangle-strip to triangles', async (t) => {
	const document = new Document().setLogger(logger);
	const prim = createTriangleStripPrim(document);
	const mesh = document.createMesh().addPrimitive(prim);
	const node = document.createNode().setMesh(mesh);
	document.createScene().addChild(node);

	convertPrimitiveToTriangles(prim);

	t.is(prim.getMode(), TRIANGLES, 'mode');
	t.deepEqual(
		Array.from(prim.getIndices().getArray()),
		// prettier-ignore
		[
			0, 1, 2,
			2, 1, 3,
			2, 3, 4,
			4, 3, 5,
			4, 5, 6,
			6, 5, 7,
			6, 7, 8,
			8, 7, 9
		],
		'indices',
	);
});

test('triangle-fan to triangles', async (t) => {
	const document = new Document().setLogger(logger);
	const prim = createTriangleFanPrim(document);
	const mesh = document.createMesh().addPrimitive(prim);
	const node = document.createNode().setMesh(mesh);
	document.createScene().addChild(node);

	convertPrimitiveToTriangles(prim);

	t.is(prim.getMode(), TRIANGLES, 'mode');
	t.deepEqual(
		Array.from(prim.getIndices().getArray()),
		// prettier-ignore
		[
			0, 1, 2,
			0, 2, 3,
			0, 3, 4,
			0, 4, 5,
			0, 5, 6,
			0, 6, 7,
			0, 7, 8,
			0, 8, 9
		],
		'indices',
	);
});

test('unsupported', async (t) => {
	const document = new Document().setLogger(logger);
	const prim = createTriangleFanPrim(document);
	const mesh = document.createMesh().addPrimitive(prim);
	const node = document.createNode().setMesh(mesh);
	document.createScene().addChild(node);

	// ?? → TRIANGLES
	t.throws(
		() => convertPrimitiveToTriangles(prim.setMode(POINTS)),
		{ message: /Only TRIANGLE_STRIP and TRIANGLE_FAN/i },
		'points to triangles',
	);
	t.throws(
		() => convertPrimitiveToTriangles(prim.setMode(LINES)),
		{ message: /Only TRIANGLE_STRIP and TRIANGLE_FAN/i },
		'lines to triangles',
	);
	t.throws(
		() => convertPrimitiveToTriangles(prim.setMode(LINE_STRIP)),
		{ message: /Only TRIANGLE_STRIP and TRIANGLE_FAN/i },
		'line-strip to triangles',
	);
	t.throws(
		() => convertPrimitiveToTriangles(prim.setMode(LINE_LOOP)),
		{ message: /Only TRIANGLE_STRIP and TRIANGLE_FAN/i },
		'line-loop to triangles',
	);

	// ?? → LINES
	t.throws(
		() => convertPrimitiveToLines(prim.setMode(POINTS)),
		{ message: /Only LINE_STRIP and LINE_LOOP/i },
		'points to triangles',
	);
	t.throws(
		() => convertPrimitiveToLines(prim.setMode(TRIANGLES)),
		{ message: /Only LINE_STRIP and LINE_LOOP/i },
		'lines to triangles',
	);
	t.throws(
		() => convertPrimitiveToLines(prim.setMode(TRIANGLE_STRIP)),
		{ message: /Only LINE_STRIP and LINE_LOOP/i },
		'line-strip to triangles',
	);
	t.throws(
		() => convertPrimitiveToLines(prim.setMode(TRIANGLE_FAN)),
		{ message: /Only LINE_STRIP and LINE_LOOP/i },
		'line-loop to triangles',
	);
});
