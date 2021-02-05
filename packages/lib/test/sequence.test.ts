require('source-map-support').install();

import test from 'tape';
import { Document } from '@gltf-transform/core';
import { sequence } from '../';

test('@gltf-transform/lib::sequence', async t => {

	const doc = new Document();
	const root = doc.getRoot();
	const scene = doc.createScene();

	for (let i = 0; i < 4; i++) {
		scene.addChild(doc.createNode(`Step.00${i + 1}`));
	}

	await doc.transform(sequence({fps: 1, pattern: /^Step\.\d{3}$/}));

	const anim = root.listAnimations().pop();

	t.ok(anim, 'creates animation');
	t.deepEquals(
		anim.listChannels().map((channel) => channel.getTargetNode().getName()),
		['Step.001', 'Step.002', 'Step.003', 'Step.004'],
		'creates one channel per node'
	);
	t.equals(anim.listChannels()[0].getTargetPath(), 'scale', 'channels target scale');
	t.equals(anim.listSamplers().length, 4, 'creates one sampler per node');
	t.deepEquals(
		anim.listSamplers()[0].getInput().getArray(),
		new Float32Array([0, 1]),
		'input #1'
	);
	t.deepEquals(
		anim.listSamplers()[0].getOutput().getArray(),
		new Float32Array([1, 1, 1, 0, 0, 0]),
		'output #1'
	);
	t.deepEquals(
		anim.listSamplers()[1].getInput().getArray(),
		new Float32Array([0, 1, 2]),
		'input #2'
	);
	t.deepEquals(
		anim.listSamplers()[1].getOutput().getArray(),
		new Float32Array([0, 0, 0, 1, 1, 1, 0, 0, 0]),
		'output #2'
	);
	t.deepEquals(
		anim.listSamplers()[2].getInput().getArray(),
		new Float32Array([1, 2, 3]),
		'input #3'
	);
	t.deepEquals(
		anim.listSamplers()[2].getOutput().getArray(),
		new Float32Array([0, 0, 0, 1, 1, 1, 0, 0, 0]),
		'output #3'
	);
	t.deepEquals(
		anim.listSamplers()[3].getInput().getArray(),
		new Float32Array([2, 3]),
		'input #4'
	);
	t.deepEquals(
		anim.listSamplers()[3].getOutput().getArray(),
		new Float32Array([0, 0, 0, 1, 1, 1]),
		'output #4'
	);

	t.end();
});
