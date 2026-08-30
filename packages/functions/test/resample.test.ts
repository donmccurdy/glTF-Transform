import { deepEqual, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Accessor, Document } from '@gltf-transform/core';
import { resample } from '@gltf-transform/functions';
import { logger, quat } from '@gltf-transform/test-utils';

describe('functions::resample', () => {
	test('all', async () => {
		const doc = new Document().setLogger(logger);

		const inArray = new Uint8Array([0, 1, 2, 3, 4, 5, 6]);
		const outArray = new Uint8Array([1, 1, 1, 1, 1, 1, 1, 2, 1, 3, 1, 4, 1, 5]);
		const outSplineArray = new Uint8Array([
			0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 2, 0, 0, 0, 0, 1, 3, 0, 0, 0, 0, 1, 4, 0, 0,
			0, 0, 1, 5, 0, 0,
		]);

		const input = doc.createAccessor('input').setType(Accessor.Type.SCALAR).setArray(inArray);
		const output = doc.createAccessor('output').setType(Accessor.Type.VEC2).setArray(outArray);
		const outputSpline = doc.createAccessor('outputSpline').setType(Accessor.Type.VEC2).setArray(outSplineArray);

		const samplerA = doc.createAnimationSampler().setInterpolation('STEP').setInput(input).setOutput(output);
		const samplerB = samplerA.clone().setInterpolation('LINEAR');
		const samplerC = samplerA.clone().setOutput(outputSpline).setInterpolation('CUBICSPLINE');

		doc.createAnimation().addSampler(samplerA).addSampler(samplerB).addSampler(samplerC);

		await doc.transform(resample());

		strictEqual(doc.getRoot().listAccessors().length, 6, 'splits shared accessors');

		// Merge duplicate keyframes.
		deepEqual(toArray(samplerA.getInput()), [0, 2, 3, 4, 5, 6], 'STEP input');
		deepEqual(toArray(samplerA.getOutput()), [1, 1, 1, 1, 1, 2, 1, 3, 1, 4, 1, 5], 'STEP output');

		// Merge colinear keyframes.
		deepEqual(toArray(samplerB.getInput()), [0, 2, 6], 'LINEAR input');
		deepEqual(toArray(samplerB.getOutput()), [1, 1, 1, 1, 1, 5], 'LINEAR output');

		// No change.
		deepEqual(toArray(samplerC.getInput()), Array.from(inArray), 'CUBICSPLINE input (unchanged)');
		deepEqual(toArray(samplerC.getOutput()), Array.from(outSplineArray), 'CUBICSPLINE output (unchanged)');
	});

	test('rotation', async () => {
		const doc = new Document().setLogger(logger);

		const inArray = new Uint8Array([0, 1, 2, 3, 4, 5, 6]);
		const outArray = new Float32Array([
			...quat.fromEuler([], 0, 0, 0),
			...quat.fromEuler([], 45, 0, 0),
			...quat.fromEuler([], 90, 0, 0),
			...quat.fromEuler([], 135, 0, 0),
			...quat.fromEuler([], 180, 0, 0), // resampling can't create >=180º steps!
			...quat.fromEuler([], 225, 0, 0),
			...quat.fromEuler([], 270, 0, 0),
		]);

		const input = doc.createAccessor('input').setType(Accessor.Type.SCALAR).setArray(inArray);
		const output = doc.createAccessor('output').setType(Accessor.Type.VEC4).setArray(outArray);
		const sampler = doc.createAnimationSampler().setInterpolation('LINEAR').setInput(input).setOutput(output);
		const channel = doc.createAnimationChannel().setTargetPath('rotation').setSampler(sampler);
		doc.createAnimation().addChannel(channel).addSampler(sampler);

		await doc.transform(resample());

		deepEqual(toArray(sampler.getInput()), [0, 3, 6], 'input');
		deepEqual(
			toArray(sampler.getOutput()),
			// biome-ignore format: Readability.
			[
			0, 0, 0, 1,
			0.9238795042037964, 0, 0, 0.3826834261417389,
			0.7071067690849304, 0, -0, -0.7071067690849304
		],
			'output',
		);
	});
});

function toArray(accessor: Accessor): number[] {
	return Array.from(accessor.getArray());
}
