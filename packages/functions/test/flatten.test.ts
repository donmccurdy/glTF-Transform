import test from 'ava';
import { Document } from '@gltf-transform/core';
import { flatten } from '@gltf-transform/functions';
import { logger } from '@gltf-transform/test-utils';

test('basic', async (t) => {
	const document = new Document().setLogger(logger);
	const mesh = document.createMesh();
	const nodeA = document.createNode('A').setTranslation([2, 0, 0]).setMesh(mesh);
	const nodeB = document.createNode('B').setScale([4, 4, 4]).addChild(nodeA).setMesh(mesh);
	const nodeC = document.createNode('C').addChild(nodeB).setMesh(mesh);
	const scene = document.createScene().addChild(nodeC);

	t.truthy(nodeA.getParentNode() === nodeB, 'B → A (before)');
	t.truthy(nodeB.getParentNode() === nodeC, 'C → B (before)');
	t.truthy(nodeC.getParentNode() === null, 'Scene → C (before)');

	await document.transform(flatten());

	t.truthy(nodeA.getParentNode() === null, 'Scene → A (after)');
	t.truthy(nodeB.getParentNode() === null, 'Scene → B (after)');
	t.truthy(nodeC.getParentNode() === null, 'Scene → C (after)');
	t.deepEqual(scene.listChildren(), [nodeC, nodeB, nodeA], 'Scene → [C, B, A] (after)');

	t.deepEqual(nodeA.getTranslation(), [8, 0, 0], 'A.translation');
	t.deepEqual(nodeA.getScale(), [4, 4, 4], 'A.scale');
	t.deepEqual(nodeB.getScale(), [4, 4, 4], 'B.scale');
});

test('skins', async (t) => {
	const document = new Document().setLogger(logger);
	const mesh = document.createMesh();
	const skin = document.createSkin();
	const nodeA = document.createNode('JointLeaf').setMesh(mesh);
	const nodeB = document.createNode('JointMid').addChild(nodeA);
	const nodeC = document.createNode('JointRoot').addChild(nodeB).setSkin(skin);
	const nodeD = document.createNode('Empty').addChild(nodeC);
	const scene = document.createScene().addChild(nodeD);

	skin.addJoint(nodeA).addJoint(nodeB).addJoint(nodeC).setSkeleton(nodeC);

	t.truthy(nodeA.getParentNode() === nodeB, 'JointMid → JointLeaf (before)');
	t.truthy(nodeB.getParentNode() === nodeC, 'JointRoot → JointMid (before)');
	t.truthy(nodeC.getParentNode() === nodeD, 'Group → JointRoot (before)');
	t.truthy(nodeD.getParentNode() === null, 'Scene → Group (before)');
	t.deepEqual(scene.listChildren(), [nodeD], 'Scene → Group (before)');

	await document.transform(flatten());

	t.truthy(nodeA.getMesh(), 'JointLeaf → mesh');
	t.truthy(nodeA.getParentNode() === nodeB, 'JointMid → JointLeaf (after)');
	t.truthy(nodeB.getParentNode() === nodeC, 'JointRoot → JointMid (after)');
	t.truthy(nodeC.getParentNode() === null, 'Scene → JointRoot (after)');
	t.truthy(nodeD.isDisposed(), 'Group disposed');
	t.deepEqual(scene.listChildren(), [nodeC], 'Scene → JointRoot (after)');
});

test('trs animation', async (t) => {
	const document = new Document().setLogger(logger);
	const mesh = document.createMesh();
	const nodeA = document.createNode('A').setMesh(mesh);
	const nodeB = document.createNode('B').setMesh(mesh);
	const nodeC = document.createNode('Group').addChild(nodeA).addChild(nodeB).setScale([2, 2, 2]);
	const scene = document.createScene().addChild(nodeC);
	const channel = document.createAnimationChannel().setTargetNode(nodeA).setTargetPath('scale');
	document.createAnimation().addChannel(channel);

	await document.transform(flatten());

	t.truthy(nodeA.getMesh(), 'A → mesh');
	t.truthy(nodeB.getMesh(), 'B → mesh');
	t.truthy(nodeA.getParentNode() === nodeC, 'Group → A');
	t.truthy(nodeB.getParentNode() === null, 'Scene → B');
	t.deepEqual(scene.listChildren(), [nodeC, nodeB], 'Scene → [Group, B]');
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

	await document.transform(flatten({ cleanup: false }));

	t.is(document.getRoot().listNodes().length, 2, 'skips prune');
	t.is(document.getRoot().listAccessors().length, 2, 'skips dedup');
});
