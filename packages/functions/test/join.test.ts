import test from 'ava';
import { getBounds, Document } from '@gltf-transform/core';
import { join, quantize } from '@gltf-transform/functions';
import { createPlatformIO, logger, roundBbox } from '@gltf-transform/test-utils';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
