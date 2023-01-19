require('source-map-support').install();

import test from 'tape';
import { Document, Logger } from '@gltf-transform/core';
import { flatten } from '@gltf-transform/functions';

const logger = new Logger(Logger.Verbosity.SILENT);

test('@gltf-transform/functions::flatten', async (t) => {
	const document = new Document().setLogger(logger);
	const mesh = document.createMesh();
	const nodeA = document.createNode('A').setTranslation([2, 0, 0]).setMesh(mesh);
	const nodeB = document.createNode('B').setScale([4, 4, 4]).addChild(nodeA).setMesh(mesh);
	const nodeC = document.createNode('C').addChild(nodeB).setMesh(mesh);
	const scene = document.createScene().addChild(nodeC);

	t.ok(nodeA.getParent() === nodeB, 'B → A (before)');
	t.ok(nodeB.getParent() === nodeC, 'C → B (before)');
	t.ok(nodeC.getParent() === scene, 'Scene → C (before)');

	await document.transform(flatten());

	t.ok(nodeA.getParent() === scene, 'Scene → A (after)');
	t.ok(nodeB.getParent() === scene, 'Scene → B (after)');
	t.ok(nodeC.getParent() === scene, 'Scene → C (after)');

	t.deepEquals(nodeA.getTranslation(), [8, 0, 0], 'A.translation');
	t.deepEquals(nodeA.getScale(), [4, 4, 4], 'A.scale');
	t.deepEquals(nodeB.getScale(), [4, 4, 4], 'B.scale');

	t.end();
});

test('@gltf-transform/functions::flatten | skins', async (t) => {
	const document = new Document().setLogger(logger);
	const mesh = document.createMesh();
	const skin = document.createSkin();
	const nodeA = document.createNode('JointLeaf').setMesh(mesh);
	const nodeB = document.createNode('JointMid').addChild(nodeA);
	const nodeC = document.createNode('JointRoot').addChild(nodeB).setSkin(skin);
	const nodeD = document.createNode('Empty').addChild(nodeC);
	const scene = document.createScene().addChild(nodeD);

	skin.addJoint(nodeA).addJoint(nodeB).addJoint(nodeC).setSkeleton(nodeC);

	t.ok(nodeA.getParent() === nodeB, 'JointMid → JointLeaf (before)');
	t.ok(nodeB.getParent() === nodeC, 'JointRoot → JointMid (before)');
	t.ok(nodeC.getParent() === nodeD, 'Group → JointRoot (before)');
	t.ok(nodeD.getParent() === scene, 'Scene → Group (before)');

	await document.transform(flatten());

	t.ok(nodeA.getMesh(), 'JointLeaf → mesh');
	t.ok(nodeA.getParent() === nodeB, 'JointMid → JointLeaf (after)');
	t.ok(nodeB.getParent() === nodeC, 'JointRoot → JointMid (after)');
	t.ok(nodeC.getParent() === scene, 'Scene → JointRoot (after)');
	t.ok(nodeD.isDisposed(), 'Group disposed');

	t.end();
});

test('@gltf-transform/functions::flatten | trs animation', async (t) => {
	const document = new Document().setLogger(logger);
	const mesh = document.createMesh();
	const nodeA = document.createNode('A').setMesh(mesh);
	const nodeB = document.createNode('B').setMesh(mesh);
	const nodeC = document.createNode('Group').addChild(nodeA).addChild(nodeB).setScale([2, 2, 2]);
	const scene = document.createScene().addChild(nodeC);
	const channel = document.createAnimationChannel().setTargetNode(nodeA).setTargetPath('scale');
	document.createAnimation().addChannel(channel);

	await document.transform(flatten());

	t.ok(nodeA.getMesh(), 'A → mesh');
	t.ok(nodeB.getMesh(), 'B → mesh');
	t.ok(nodeA.getParent() === nodeC, 'Group → A');
	t.ok(nodeB.getParent() === scene, 'Scene → B');
	t.deepEquals(scene.listChildren(), [nodeC, nodeB], 'Scene → [Group, B]');

	t.end();
});
