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

test('toHash', async (t) => {
	const document = new Document();
	const materialA = document.createMaterial();
	const materialB = document.createMaterial();

	t.is(materialA.toHash(), materialB.toHash(), 'default == default');

	materialA.setName('MaterialA');
	materialB.setName('MaterialB');

	t.not(materialA.toHash(), materialB.toHash(), 'name !== name');

	const skip = new Set(['name']);
	t.is(materialA.toHash(skip), materialB.toHash(skip), 'skip attributes');

	materialA
		.setBaseColorFactor([0.5, 0.5, 0.5, 1])
		.setRoughnessFactor(1.0)
		.setMetallicFactor(0)
		.setAlphaMode('MASK')
		.setDoubleSided(true)
		.setExtras({ hello: 'world' });
	materialB.copy(materialA);

	t.is(materialA.toHash(), materialB.toHash(), 'primitive attributes, equal');

	materialB.setDoubleSided(false);

	t.not(materialA.toHash(), materialB.toHash(), 'primitive attributes, not equal');

	const image = new Uint8Array([1, 2, 3, 4]);
	const textureA = document.createTexture().setImage(image);
	const textureB = document.createTexture().setImage(image);
	materialB.copy(materialA);
	materialA.setBaseColorTexture(textureA);
	materialB.setBaseColorTexture(textureB);

	t.is(materialA.toHash(), materialB.toHash(), 'ref attributes, equal');

	textureB.setImage(new Uint8Array([5, 6, 7, 8]));

	t.not(materialA.toHash(), materialB.toHash(), 'ref attributes, not equal');
});
