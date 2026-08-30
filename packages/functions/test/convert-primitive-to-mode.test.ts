import { deepEqual, strictEqual, throws } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, Primitive } from '@gltf-transform/core';
import { convertPrimitiveToLines, convertPrimitiveToTriangles } from '@gltf-transform/functions';
import {
	createLineLoopPrim,
	createLineStripPrim,
	createTriangleFanPrim,
	createTriangleStripPrim,
	logger,
} from '@gltf-transform/test-utils';

const { POINTS, LINES, LINE_STRIP, LINE_LOOP, TRIANGLES, TRIANGLE_STRIP, TRIANGLE_FAN } = Primitive.Mode;

describe('functions::convertPrimitiveToMode', () => {
	test('line-strip to lines', async () => {
		const document = new Document().setLogger(logger);
		const prim = createLineStripPrim(document);
		const mesh = document.createMesh().addPrimitive(prim);
		const node = document.createNode().setMesh(mesh);
		document.createScene().addChild(node);

		convertPrimitiveToLines(prim);

		strictEqual(prim.getMode(), LINES, 'mode');
		deepEqual(
			Array.from(prim.getIndices().getArray()),
			// biome-ignore format: Readability.
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

	test('line-loop to lines', async () => {
		const document = new Document().setLogger(logger);
		const prim = createLineLoopPrim(document);
		const mesh = document.createMesh().addPrimitive(prim);
		const node = document.createNode().setMesh(mesh);
		document.createScene().addChild(node);

		convertPrimitiveToLines(prim);

		strictEqual(prim.getMode(), LINES, 'mode');
		deepEqual(
			Array.from(prim.getIndices().getArray()),
			// biome-ignore format: Readability.
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

	test('triangle-strip to triangles', async () => {
		const document = new Document().setLogger(logger);
		const prim = createTriangleStripPrim(document);
		const mesh = document.createMesh().addPrimitive(prim);
		const node = document.createNode().setMesh(mesh);
		document.createScene().addChild(node);

		convertPrimitiveToTriangles(prim);

		strictEqual(prim.getMode(), TRIANGLES, 'mode');
		deepEqual(
			Array.from(prim.getIndices().getArray()),
			// biome-ignore format: Readability.
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

	test('triangle-fan to triangles', async () => {
		const document = new Document().setLogger(logger);
		const prim = createTriangleFanPrim(document);
		const mesh = document.createMesh().addPrimitive(prim);
		const node = document.createNode().setMesh(mesh);
		document.createScene().addChild(node);

		convertPrimitiveToTriangles(prim);

		strictEqual(prim.getMode(), TRIANGLES, 'mode');
		deepEqual(
			Array.from(prim.getIndices().getArray()),
			// biome-ignore format: Readability.
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

	test('unsupported', async () => {
		const document = new Document().setLogger(logger);
		const prim = createTriangleFanPrim(document);
		const mesh = document.createMesh().addPrimitive(prim);
		const node = document.createNode().setMesh(mesh);
		document.createScene().addChild(node);

		// ?? → TRIANGLES
		throws(
			() => convertPrimitiveToTriangles(prim.setMode(POINTS)),
			{ message: /Only TRIANGLE_STRIP and TRIANGLE_FAN/i },
			'points to triangles',
		);
		throws(
			() => convertPrimitiveToTriangles(prim.setMode(LINES)),
			{ message: /Only TRIANGLE_STRIP and TRIANGLE_FAN/i },
			'lines to triangles',
		);
		throws(
			() => convertPrimitiveToTriangles(prim.setMode(LINE_STRIP)),
			{ message: /Only TRIANGLE_STRIP and TRIANGLE_FAN/i },
			'line-strip to triangles',
		);
		throws(
			() => convertPrimitiveToTriangles(prim.setMode(LINE_LOOP)),
			{ message: /Only TRIANGLE_STRIP and TRIANGLE_FAN/i },
			'line-loop to triangles',
		);

		// ?? → LINES
		throws(
			() => convertPrimitiveToLines(prim.setMode(POINTS)),
			{ message: /Only LINE_STRIP and LINE_LOOP/i },
			'points to triangles',
		);
		throws(
			() => convertPrimitiveToLines(prim.setMode(TRIANGLES)),
			{ message: /Only LINE_STRIP and LINE_LOOP/i },
			'lines to triangles',
		);
		throws(
			() => convertPrimitiveToLines(prim.setMode(TRIANGLE_STRIP)),
			{ message: /Only LINE_STRIP and LINE_LOOP/i },
			'line-strip to triangles',
		);
		throws(
			() => convertPrimitiveToLines(prim.setMode(TRIANGLE_FAN)),
			{ message: /Only LINE_STRIP and LINE_LOOP/i },
			'line-loop to triangles',
		);
	});
});
