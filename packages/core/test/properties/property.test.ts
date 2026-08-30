import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, type vec3 } from '@gltf-transform/core';

describe('core::Property', () => {
	test('equals', async () => {
		const document = new Document();
		const nodeA = document.createNode();
		const nodeB = document.createNode();

		ok(nodeA.equals(nodeB), 'empty extras');

		nodeA.setExtras({ a: 1 });
		nodeB.setExtras({ a: 1 });

		ok(nodeA.equals(nodeB), 'same extras');

		nodeB.setExtras({ a: 1, b: 2 });

		strictEqual(nodeA.equals(nodeB), false, 'different extras');
	});

	test('internal arrays', async () => {
		const document = new Document();
		const translation = [0, 0, 0] as vec3;
		const node = document.createNode('A').setTranslation(translation);

		deepEqual(node.getTranslation(), [0, 0, 0], 'stores original value');

		// Array literals (vector, quaternion, color, …) must be stored as copies.
		translation[1] = 0.5;

		deepEqual(node.getTranslation(), [0, 0, 0], 'unchanged by external mutation');
	});

	test('listParents', async () => {
		const document = new Document();
		const root = document.getRoot();
		const nodeA = document.createNode('NodeA');
		const nodeB = document.createNode('NodeB');
		const sceneA = document.createScene('SceneA').addChild(nodeA).addChild(nodeB);
		const sceneB = document.createScene('SceneB').addChild(nodeA).addChild(nodeB);
		root.setDefaultScene(sceneA);

		deepEqual(root.listParents(), []);
		deepEqual(sceneA.listParents(), [root]);
		deepEqual(nodeA.listParents(), [root, sceneA, sceneB]);
		deepEqual(nodeB.listParents(), [root, sceneA, sceneB]);
	});

	test('listChildren', async () => {
		const document = new Document();
		const root = document.getRoot();
		const nodeA = document.createNode('NodeA');
		const nodeB = document.createNode('NodeB');
		const sceneA = document.createScene('SceneA').addChild(nodeA).addChild(nodeB);
		const sceneB = document.createScene('SceneB').addChild(nodeA).addChild(nodeB);
		root.setDefaultScene(sceneA);

		const graph = document.getGraph();

		deepEqual(graph.listChildren(root), [nodeA, nodeB, sceneA, sceneB]);
		deepEqual(graph.listChildren(sceneA), [nodeA, nodeB]);
		deepEqual(graph.listChildren(sceneB), [nodeA, nodeB]);
		deepEqual(graph.listChildren(nodeA), []);
		deepEqual(graph.listChildren(nodeB), []);
	});
});
