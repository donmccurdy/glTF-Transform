require('source-map-support').install();

import * as test from 'tape';
import { Accessor, Document, GLTF, Logger } from '@gltf-transform/core';
import { resample } from '../';

test('@gltf-transform/lib::resample', async t => {
	const doc = new Document().setLogger(new Logger(Logger.Verbosity.SILENT));

	const inputArray = new Uint8Array([0, 1, 2, 3, 4, 5, 6]);
	const outputArray = new Uint8Array([
		1, 1,
		1, 1,
		1, 1,
		1, 2,
		1, 3,
		1, 4,
		1, 5,
	]);

	const input = doc.createAccessor('input')
		.setType(Accessor.Type.SCALAR)
		.setArray(inputArray);
	const output = doc.createAccessor('trackA')
		.setType(Accessor.Type.VEC2)
		.setArray(outputArray);

	const samplerA = doc.createAnimationSampler()
		.setInterpolation(GLTF.AnimationSamplerInterpolation.STEP)
		.setInput(input)
		.setOutput(output);
	const samplerB = samplerA.clone()
		.setInterpolation(GLTF.AnimationSamplerInterpolation.LINEAR);
	const samplerC = samplerA.clone()
		.setInterpolation(GLTF.AnimationSamplerInterpolation.CUBICSPLINE);

	doc.createAnimation()
		.addSampler(samplerA)
		.addSampler(samplerB)
		.addSampler(samplerC);

	await doc.transform(resample());

	t.equals(doc.getRoot().listAccessors().length, 6, 'splits shared accessors');

	// Merge duplicate keyframes.
	t.deepEquals(samplerA.getInput().getArray(), new Uint8Array([0, 2, 3, 4, 5, 6]), 'STEP input');
	t.deepEquals(
		samplerA.getOutput().getArray(),
		new Uint8Array([1, 1, 1, 1, 1, 2, 1, 3, 1, 4, 1, 5]),
		'STEP output'
	);

	// Merge colinear keyframes.
	t.deepEquals(samplerB.getInput().getArray(), new Uint8Array([0, 2, 6]), 'LINEAR input');
	t.deepEquals(
		samplerB.getOutput().getArray(),
		new Uint8Array([1, 1, 1, 1, 1, 5]),
		'LINEAR output'
	);

	// No change.
	t.deepEquals(samplerC.getInput().getArray(), inputArray, 'CUBICSPLINE input (unchanged)');
	t.deepEquals(samplerC.getOutput().getArray(), outputArray, 'CUBICSPLINE output (unchanged)');
	t.end();
});
