import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document } from '@gltf-transform/core';
import { flatten } from '@gltf-transform/functions';
import { logger } from '@gltf-transform/test-utils';

describe('functions::flatten', () => {
	test('basic', async () => {
		const document = new Document().setLogger(logger);
		const mesh = document.createMesh();
		const nodeA = document.createNode('A').setTranslation([2, 0, 0]).setMesh(mesh);
		const nodeB = document.createNode('B').setScale([4, 4, 4]).addChild(nodeA).setMesh(mesh);
		const nodeC = document.createNode('C').addChild(nodeB).setMesh(mesh);
		const scene = document.createScene().addChild(nodeC);

		ok(nodeA.getParentNode() === nodeB, 'B → A (before)');
		ok(nodeB.getParentNode() === nodeC, 'C → B (before)');
		ok(nodeC.getParentNode() === null, 'Scene → C (before)');

		await document.transform(flatten());

		ok(nodeA.getParentNode() === null, 'Scene → A (after)');
		ok(nodeB.getParentNode() === null, 'Scene → B (after)');
		ok(nodeC.getParentNode() === null, 'Scene → C (after)');
		deepEqual(scene.listChildren(), [nodeC, nodeB, nodeA], 'Scene → [C, B, A] (after)');

		deepEqual(nodeA.getTranslation(), [8, 0, 0], 'A.translation');
		deepEqual(nodeA.getScale(), [4, 4, 4], 'A.scale');
		deepEqual(nodeB.getScale(), [4, 4, 4], 'B.scale');
	});

	test('skins', async () => {
		const document = new Document().setLogger(logger);
		const mesh = document.createMesh();
		const skin = document.createSkin();
		const nodeA = document.createNode('JointLeaf').setMesh(mesh);
		const nodeB = document.createNode('JointMid').addChild(nodeA);
		const nodeC = document.createNode('JointRoot').addChild(nodeB).setSkin(skin);
		const nodeD = document.createNode('Empty').addChild(nodeC);
		const scene = document.createScene().addChild(nodeD);

		skin.addJoint(nodeA).addJoint(nodeB).addJoint(nodeC).setSkeleton(nodeC);

		ok(nodeA.getParentNode() === nodeB, 'JointMid → JointLeaf (before)');
		ok(nodeB.getParentNode() === nodeC, 'JointRoot → JointMid (before)');
		ok(nodeC.getParentNode() === nodeD, 'Group → JointRoot (before)');
		ok(nodeD.getParentNode() === null, 'Scene → Group (before)');
		deepEqual(scene.listChildren(), [nodeD], 'Scene → Group (before)');

		await document.transform(flatten());

		ok(nodeA.getMesh(), 'JointLeaf → mesh');
		ok(nodeA.getParentNode() === nodeB, 'JointMid → JointLeaf (after)');
		ok(nodeB.getParentNode() === nodeC, 'JointRoot → JointMid (after)');
		ok(nodeC.getParentNode() === null, 'Scene → JointRoot (after)');
		ok(nodeD.isDisposed(), 'Group disposed');
		deepEqual(scene.listChildren(), [nodeC], 'Scene → JointRoot (after)');
	});

	test('trs animation', async () => {
		const document = new Document().setLogger(logger);
		const mesh = document.createMesh();
		const nodeA = document.createNode('A').setMesh(mesh);
		const nodeB = document.createNode('B').setMesh(mesh);
		const nodeC = document.createNode('Group').addChild(nodeA).addChild(nodeB).setScale([2, 2, 2]);
		const scene = document.createScene().addChild(nodeC);
		const channel = document.createAnimationChannel().setTargetNode(nodeA).setTargetPath('scale');
		document.createAnimation().addChannel(channel);

		await document.transform(flatten());

		ok(nodeA.getMesh(), 'A → mesh');
		ok(nodeB.getMesh(), 'B → mesh');
		ok(nodeA.getParentNode() === nodeC, 'Group → A');
		ok(nodeB.getParentNode() === null, 'Scene → B');
		deepEqual(scene.listChildren(), [nodeC, nodeB], 'Scene → [Group, B]');
	});

	test('no side effects', async () => {
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

		strictEqual(document.getRoot().listNodes().length, 2, 'skips prune');
		strictEqual(document.getRoot().listAccessors().length, 2, 'skips dedup');
	});
});
