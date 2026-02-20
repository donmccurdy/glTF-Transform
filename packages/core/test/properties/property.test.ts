import { Document, type vec3 } from '@gltf-transform/core';
import test from 'ava';

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

test('equals - depth', async (t) => {
	// Use cases:
	// - Skins may have deeply-equal joint nodes, but nodes are not interchangable.
	// - Materials reference unique TextureInfos, which must be compared deeply.

	const document = new Document();
	const nodeA = document.createNode();
	const nodeB = document.createNode().addChild(nodeA);
	const nodeC = document.createNode().addChild(nodeB);

	const nodeD = document.createNode();
	const nodeE = document.createNode().addChild(nodeD);
	const nodeF = document.createNode().addChild(nodeE);

	t.false(nodeC.equals(nodeF, undefined, 0), 'depth = 0');
	t.false(nodeC.equals(nodeF, undefined, 1), 'depth = 1');
	t.true(nodeC.equals(nodeF, undefined, 2), 'depth = 2');
	t.true(nodeC.equals(nodeF, undefined, 3), 'depth = 3');
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
