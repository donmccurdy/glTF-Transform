require('source-map-support').install();

import test from 'tape';
import { Document } from '@gltf-transform/core';
import { prune } from '../';

test('@gltf-transform/lib::prune', async t => {

	const doc = new Document();

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
