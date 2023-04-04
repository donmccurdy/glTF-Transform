import test from 'ava';
import { Document } from '@gltf-transform/core';
import { createPlatformIO } from '@gltf-transform/test-utils';

test('copy', (t) => {
	const document = new Document();
	const scene = document
		.createScene('MyScene')
		.addChild(document.createNode('Node1'))
		.addChild(document.createNode('Node2'));
	// See {@link Scene.copy}.
	t.throws(() => document.createScene().copy(scene), { message: /Scene cannot be copied/i }, 'cannot copy scene');
});

test('traverse', (t) => {
	const document = new Document();
	const scene = document
		.createScene('MyScene')
		.addChild(document.createNode('Node1'))
		.addChild(document.createNode('Node2'));

	let count = 0;
	scene.traverse((_) => count++);
	t.is(count, 2, 'traverses all nodes');
});

test('extras', async (t) => {
	const io = await createPlatformIO();
	const document = new Document();
	document.createScene('A').setExtras({ foo: 1, bar: 2 });

	const doc2 = await io.readJSON(await io.writeJSON(document, { basename: 'test' }));

	t.deepEqual(document.getRoot().listScenes()[0].getExtras(), { foo: 1, bar: 2 }, 'stores extras');
	t.deepEqual(doc2.getRoot().listScenes()[0].getExtras(), { foo: 1, bar: 2 }, 'roundtrips extras');
});
