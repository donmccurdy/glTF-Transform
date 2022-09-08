require('source-map-support').install();

import test from 'tape';
import { Document, Logger, PropertyType } from '@gltf-transform/core';
import { prune } from '../';

const logger = new Logger(Logger.Verbosity.SILENT);

test('@gltf-transform/functions::prune', async (t) => {
	const doc = new Document().setLogger(logger);

	// Create used resources.
	const mesh = doc.createMesh();
	const node = doc.createNode().setMesh(mesh);
	const scene = doc.createScene().addChild(node);
	const chan = doc.createAnimationChannel().setTargetNode(node);
	const samp = doc.createAnimationSampler();
	const anim = doc.createAnimation().addChannel(chan).addSampler(samp);

	// Create unused resources.
	const mesh2 = doc.createMesh();
	const node2 = doc.createNode().setMesh(mesh2);
	const chan2 = doc.createAnimationChannel().setTargetNode(node2);
	const samp2 = doc.createAnimationSampler();
	const anim2 = doc.createAnimation().addChannel(chan2).addSampler(samp2);

	await doc.transform(prune());

	t.notOk(scene.isDisposed(), 'referenced scene');
	t.notOk(mesh.isDisposed(), 'referenced mesh');
	t.notOk(node.isDisposed(), 'referenced node');
	t.notOk(anim.isDisposed(), 'referenced animation');
	t.notOk(samp.isDisposed(), 'referenced sampler');
	t.notOk(chan.isDisposed(), 'referenced channel');

	t.ok(mesh2.isDisposed(), 'unreferenced mesh');
	t.ok(node2.isDisposed(), 'unreferenced node');
	t.ok(anim2.isDisposed(), 'unreferenced animation');
	t.ok(samp2.isDisposed(), 'unreferenced sampler');
	t.ok(chan2.isDisposed(), 'unreferenced channel');

	t.end();
});

test('@gltf-transform/functions::prune | leaf nodes', async (t) => {
	const document = new Document().setLogger(logger);

	// Create used resources.
	const mesh = document.createMesh();
	const skin = document.createSkin();
	const nodeC = document.createNode('C').setMesh(mesh);
	const nodeB = document.createNode('B').addChild(nodeC);
	const nodeA = document.createNode('A').addChild(nodeB).setSkin(skin);
	const scene = document.createScene().addChild(nodeA);

	await document.transform(prune({ keepLeaves: true }));

	t.notOk(scene.isDisposed(), 'scene in tree');
	t.notOk(nodeA.isDisposed(), 'nodeA in tree');
	t.notOk(nodeB.isDisposed(), 'nodeB in tree');
	t.notOk(nodeC.isDisposed(), 'nodeC in tree');
	t.notOk(mesh.isDisposed(), 'mesh in tree');
	t.notOk(skin.isDisposed(), 'skin in tree');

	mesh.dispose();
	await document.transform(prune());

	t.notOk(scene.isDisposed(), 'scene in tree');
	t.notOk(nodeA.isDisposed(), 'nodeA in tree');
	t.ok(nodeB.isDisposed(), 'nodeB disposed');
	t.ok(nodeC.isDisposed(), 'nodeC disposed');

	skin.dispose();
	await document.transform(prune({ keepLeaves: false, propertyTypes: [] }));

	t.notOk(scene.isDisposed(), 'scene in tree');
	t.notOk(nodeA.isDisposed(), 'nodeA disposed');

	await document.transform(prune({ keepLeaves: false, propertyTypes: [PropertyType.NODE] }));

	t.notOk(scene.isDisposed(), 'scene in tree');
	t.ok(nodeA.isDisposed(), 'nodeA disposed');

	t.end();
});
