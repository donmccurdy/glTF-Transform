import test from 'ava';
import { Document, Property } from '@gltf-transform/core';
import { createPlatformIO } from '@gltf-transform/test-utils';

const toName = (p: Property) => p.getName();

test('parent', (t) => {
	const document = new Document();
	const sceneA = document.createScene('SceneA');
	const sceneB = document.createScene('SceneB');
	const nodeA = document.createNode('NodeA');
	const nodeB = document.createNode('NodeB');

	// 1. adding node as child of node must de-parent from N scenes [and <=1 node, tested in node.test.ts]
	// 2. adding node as child of scene must de-parent from <=1 node [but not scenes]

	sceneA.addChild(nodeA);
	sceneB.addChild(nodeA);

	t.deepEqual(sceneA.listChildren().map(toName), ['NodeA'], 'NodeA ∈ SceneA');
	t.deepEqual(sceneB.listChildren().map(toName), ['NodeA'], 'NodeA ∈ SceneB');

	nodeB.addChild(nodeA);

	t.deepEqual(sceneA.listChildren().map(toName), [], 'SceneA = ∅');
	t.deepEqual(sceneB.listChildren().map(toName), [], 'SceneB = ∅');
	t.deepEqual(nodeB.listChildren().map(toName), ['NodeA'], 'NodeA ∈ NodeB');

	sceneA.addChild(nodeA);

	t.deepEqual(sceneA.listChildren().map(toName), ['NodeA'], 'NodeA ∈ SceneA');
	t.deepEqual(sceneB.listChildren().map(toName), [], 'SceneB = ∅');
	t.deepEqual(nodeB.listChildren().map(toName), [], 'NodeB = ∅');
});

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
