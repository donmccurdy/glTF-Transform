import test from 'ava';
import { Document, NodeIO, Primitive } from '@gltf-transform/core';
import { convertPrimitiveToLines, convertPrimitiveToTriangles } from '@gltf-transform/functions';
import {
	logger,
	createPlatformIO,
	createLineStripPrim,
	createLineLoopPrim,
	createTriangleStripPrim,
	createTriangleFanPrim,
} from '@gltf-transform/test-utils';

const { POINTS, LINES, LINE_STRIP, LINE_LOOP, TRIANGLES, TRIANGLE_STRIP, TRIANGLE_FAN } = Primitive.Mode;

// TODO(impl)
test.skip('line-strip to lines', async (t) => {
	const document = new Document().setLogger(logger);
	const prim = createLineStripPrim(document);

	const io = (await createPlatformIO()) as NodeIO;
	await io.write('line-strip.glb', document);

	convertPrimitiveToLines(prim);

	t.is(prim.getMode(), LINES, 'mode');

	await io.write('line-loop+strip.glb', document);
});

// TODO(impl)
test.skip('line-loop to lines', async (t) => {
	const document = new Document().setLogger(logger);
	const prim = createLineLoopPrim(document);

	const io = (await createPlatformIO()) as NodeIO;
	await io.write('line-loop.glb', document);

	convertPrimitiveToLines(prim);

	t.is(prim.getMode(), LINES, 'mode');

	await io.write('line-loop+converted.glb', document);
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
