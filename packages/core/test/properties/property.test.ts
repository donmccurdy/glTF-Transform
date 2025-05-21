import test from 'ava';
import { Document, vec3 } from '@gltf-transform/core';

test('equals', async (t) => {
	const document = new Document();
	const nodeA = document.createNode();
	const nodeB = document.createNode();

	t.truthy(nodeA.equals(nodeB), 'empty extras');

	nodeA.setExtras({ a: 1 });
	nodeB.setExtras({ a: 1 });

	t.truthy(nodeA.equals(nodeB), 'same extras');

	nodeB.setExtras({ a: 1, b: 2 });

	t.falsy(nodeA.equals(nodeB), 'different extras');
});

test('internal arrays', async (t) => {
	const document = new Document();
	const translation = [0, 0, 0] as vec3;
	const node = document.createNode('A').setTranslation(translation);

	t.deepEqual(node.getTranslation(), [0, 0, 0], 'stores original value');

	// Array literals (vector, quaternion, color, …) must be stored as copies.
	translation[1] = 0.5;

	t.deepEqual(node.getTranslation(), [0, 0, 0], 'unchanged by external mutation');
});

test('listParents', async (t) => {
	const document = new Document();
	const root = document.getRoot();
	const nodeA = document.createNode('NodeA');
	const nodeB = document.createNode('NodeB');
	const sceneA = document.createScene('SceneA').addChild(nodeA).addChild(nodeB);
	const sceneB = document.createScene('SceneB').addChild(nodeA).addChild(nodeB);
	root.setDefaultScene(sceneA);

	t.deepEqual(root.listParents(), []);
	t.deepEqual(sceneA.listParents(), [root]);
	t.deepEqual(nodeA.listParents(), [root, sceneA, sceneB]);
	t.deepEqual(nodeB.listParents(), [root, sceneA, sceneB]);
});

test('listChildren', async (t) => {
	const document = new Document();
	const root = document.getRoot();
	const nodeA = document.createNode('NodeA');
	const nodeB = document.createNode('NodeB');
	const sceneA = document.createScene('SceneA').addChild(nodeA).addChild(nodeB);
	const sceneB = document.createScene('SceneB').addChild(nodeA).addChild(nodeB);
	root.setDefaultScene(sceneA);

	const graph = document.getGraph();

	t.deepEqual(graph.listChildren(root), [nodeA, nodeB, sceneA, sceneB]);
	t.deepEqual(graph.listChildren(sceneA), [nodeA, nodeB]);
	t.deepEqual(graph.listChildren(sceneB), [nodeA, nodeB]);
	t.deepEqual(graph.listChildren(nodeA), []);
	t.deepEqual(graph.listChildren(nodeB), []);
});
