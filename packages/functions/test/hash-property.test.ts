import { Document } from '@gltf-transform/core';
import { hashProperty } from '@gltf-transform/functions';
import test from 'ava';

test('hashProperty', async (t) => {
	const document = new Document();
	const materialA = document.createMaterial();
	const materialB = document.createMaterial();

	t.is(hashProperty(materialA), hashProperty(materialB), 'default == default');

	materialA.setName('MaterialA');
	materialB.setName('MaterialB');

	t.not(hashProperty(materialA), hashProperty(materialB), 'name !== name');

	const skip = new Set(['name']);
	t.is(hashProperty(materialA, { skip }), hashProperty(materialB, { skip }), 'skip attributes');

	materialA
		.setBaseColorFactor([0.5, 0.5, 0.5, 1])
		.setRoughnessFactor(1.0)
		.setMetallicFactor(0)
		.setAlphaMode('MASK')
		.setDoubleSided(true)
		.setExtras({ hello: 'world' });
	materialB.copy(materialA);

	t.is(hashProperty(materialA), hashProperty(materialB), 'primitive attributes, equal');

	materialB.setDoubleSided(false);

	t.not(hashProperty(materialA), hashProperty(materialB), 'primitive attributes, not equal');

	const image = new Uint8Array([1, 2, 3, 4]);
	const textureA = document.createTexture().setImage(image);
	const textureB = document.createTexture().setImage(image);
	materialB.copy(materialA);
	materialA.setBaseColorTexture(textureA);
	materialB.setBaseColorTexture(textureB);

	t.is(hashProperty(materialA), hashProperty(materialB), 'ref attributes, equal');

	textureB.setImage(new Uint8Array([5, 6, 7, 8]));

	t.not(hashProperty(materialA), hashProperty(materialB), 'ref attributes, not equal');
});

test('hashProperty - depth', async (t) => {
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

	t.true(hashProperty(nodeC, { depth: 0 }) !== hashProperty(nodeF, { depth: 0 }), 'depth = 0');
	t.true(hashProperty(nodeC, { depth: 1 }) !== hashProperty(nodeF, { depth: 1 }), 'depth = 1');
	t.true(hashProperty(nodeC, { depth: 2 }) === hashProperty(nodeF, { depth: 2 }), 'depth = 2');
	t.true(hashProperty(nodeC, { depth: 3 }) === hashProperty(nodeF, { depth: 3 }), 'depth = 3');
});

test('hashProperty - circular references', async (t) => {
	// Create a circular reference, nodeA -> nodeB -> skin -> nodeA.
	const document = new Document();
	const meshNode = document.createNode('Mesh');
	const skeletonNode = document.createNode('Skeleton').addChild(meshNode);
	const skin = document.createSkin().addJoint(skeletonNode).setSkeleton(skeletonNode);
	meshNode.setMesh(document.createMesh()).setSkin(skin);

	t.is(typeof hashProperty(meshNode), 'number', 'computes hash');
});
