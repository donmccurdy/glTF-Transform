import test from 'ava';
import { Document, NodeIO, Primitive } from '@gltf-transform/core';
import { convertPrimitiveToBasicMode } from '@gltf-transform/functions';
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
