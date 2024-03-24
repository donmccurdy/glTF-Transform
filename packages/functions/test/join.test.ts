import test from 'ava';
import { getBounds, Document, Primitive } from '@gltf-transform/core';
import { join, quantize, transformPrimitive } from '@gltf-transform/functions';
import {
	createLineLoopPrim,
	createLineStripPrim,
	createPlatformIO,
	createTriangleFanPrim,
	createTriangleStripPrim,
	logger,
	roundBbox,
	mat4,
} from '@gltf-transform/test-utils';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const { LINES, TRIANGLES } = Primitive.Mode;

test('basic', async (t) => {
	const io = await createPlatformIO();
	const document = await io.read(path.join(__dirname, './in/ShapeCollection.glb'));
	const scene = document.getRoot().getDefaultScene();

	const bboxBefore = getBounds(scene);
	await document.transform(join());
	const bboxAfter = getBounds(scene);

	t.is(document.getRoot().listMeshes().length, 1, '1 mesh');
	t.deepEqual(bboxAfter, bboxBefore, 'same bbox');
});

test('quantization', async (t) => {
	const io = await createPlatformIO();
	const document = await io.read(path.join(__dirname, './in/ShapeCollection.glb'));
	const scene = document.getRoot().getDefaultScene();

	const bboxBefore = getBounds(scene);
	await document.transform(quantize(), join());
	const bboxAfter = roundBbox(getBounds(scene));

	t.is(document.getRoot().listMeshes().length, 1, '1 mesh');
	t.deepEqual(bboxAfter, bboxBefore, 'same bbox');
});

test('no side effects', async (t) => {
	const document = new Document().setLogger(logger);
	const attributeA = document
		.createAccessor()
		.setType('VEC3')
		.setArray(new Float32Array([1, 2, 3]));
	const attributeB = attributeA.clone();
	const prim = document.createPrimitive().setAttribute('POSITION', attributeA).setAttribute('NORMAL', attributeB);
	const mesh = document.createMesh().addPrimitive(prim);
	const nodeA = document.createNode('A').setMesh(mesh);
	const nodeB = document.createNode('B');
	document.createScene().addChild(nodeA).addChild(nodeB);

	await document.transform(join({ cleanup: false }));

	t.is(document.getRoot().listNodes().length, 2, 'skips prune');
	t.is(document.getRoot().listAccessors().length, 2, 'skips dedup');
});

test('primitive modes', async (t) => {
	const document = new Document().setLogger(logger);
	const primLineStrip = createLineStripPrim(document);
	const primLineLoop = createLineLoopPrim(document);
	const primTriangleStrip = createTriangleStripPrim(document);
	const primTriangleFan = createTriangleFanPrim(document);
	const mesh = document
		.createMesh()
		.addPrimitive(primLineStrip)
		.addPrimitive(primLineLoop)
		.addPrimitive(primTriangleStrip)
		.addPrimitive(primTriangleFan);
	const node = document.createNode().setMesh(mesh);
	document.createScene().addChild(node);

	transformPrimitive(primLineStrip, mat4.fromTranslation([], [-4, 0, 0]));
	transformPrimitive(primLineLoop, mat4.fromTranslation([], [-2, 0, 0]));
	transformPrimitive(primTriangleStrip, mat4.fromTranslation([], [2, 0, 0]));
	transformPrimitive(primTriangleFan, mat4.fromTranslation([], [4, 0, 0]));

	await document.transform(join());

	t.true(primLineStrip.isDisposed(), 'line-strip disposed');
	t.true(primLineLoop.isDisposed(), 'line-loop disposed');
	t.true(primTriangleStrip.isDisposed(), 'triangle-strip disposed');
	t.true(primTriangleFan.isDisposed(), 'triangle-fan disposed');

	t.false(mesh.isDisposed(), 'mesh not disposed');
	t.is(mesh.listPrimitives().length, 2, 'mesh has two (2) prims');
	t.is(mesh.listPrimitives()[0].getMode(), LINES, 'joins line-strip and line-loop');
	t.is(mesh.listPrimitives()[1].getMode(), TRIANGLES, 'joins triangle-strip and triangle-fan');
});
