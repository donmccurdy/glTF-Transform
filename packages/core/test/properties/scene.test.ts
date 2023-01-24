import test from 'ava';
import { createPlatformIO } from '../../../test-utils';
import { Document } from '@gltf-transform/core';

test('@gltf-transform/core::scene | copy', (t) => {
	const doc = new Document();
	const scene = doc.createScene('MyScene').addChild(doc.createNode('Node1')).addChild(doc.createNode('Node2'));
	// See {@link Scene.copy}.
	t.throws(() => doc.createScene().copy(scene), { message: /Scene cannot be copied/i }, 'cannot copy scene');
});

test('@gltf-transform/core::scene | traverse', (t) => {
	const doc = new Document();
	const scene = doc.createScene('MyScene').addChild(doc.createNode('Node1')).addChild(doc.createNode('Node2'));

	let count = 0;
	scene.traverse((_) => count++);
	t.is(count, 2, 'traverses all nodes');
});

test('@gltf-transform/core::scene | extras', async (t) => {
	const io = await createPlatformIO();
	const doc = new Document();
	doc.createScene('A').setExtras({ foo: 1, bar: 2 });

	const doc2 = await io.readJSON(await io.writeJSON(doc, { basename: 'test' }));

	t.deepEqual(doc.getRoot().listScenes()[0].getExtras(), { foo: 1, bar: 2 }, 'stores extras');
	t.deepEqual(doc2.getRoot().listScenes()[0].getExtras(), { foo: 1, bar: 2 }, 'roundtrips extras');
});
