require('source-map-support').install();

import test from 'tape';
import { Accessor, Document, Logger } from '@gltf-transform/core';
import { resample } from '../';

test('@gltf-transform/functions::resample', async (t) => {
	const doc = new Document().setLogger(new Logger(Logger.Verbosity.SILENT));

	const inArray = new Uint8Array([0, 1, 2, 3, 4, 5, 6]);
	const outArray = new Uint8Array([1, 1, 1, 1, 1, 1, 1, 2, 1, 3, 1, 4, 1, 5]);
	const outSplineArray = new Uint8Array([
		0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 2, 0, 0, 0, 0, 1, 3, 0, 0, 0, 0, 1, 4, 0, 0, 0,
		0, 1, 5, 0, 0,
	]);

	const input = doc.createAccessor('input').setType(Accessor.Type.SCALAR).setArray(inArray);
	const output = doc.createAccessor('output').setType(Accessor.Type.VEC2).setArray(outArray);
	const outputSpline = doc.createAccessor('outputSpline').setType(Accessor.Type.VEC2).setArray(outSplineArray);

	const samplerA = doc.createAnimationSampler().setInterpolation('STEP').setInput(input).setOutput(output);
	const samplerB = samplerA.clone().setInterpolation('LINEAR');
	const samplerC = samplerA.clone().setOutput(outputSpline).setInterpolation('CUBICSPLINE');

	doc.createAnimation().addSampler(samplerA).addSampler(samplerB).addSampler(samplerC);

	await doc.transform(resample());

	t.equals(doc.getRoot().listAccessors().length, 6, 'splits shared accessors');

	// Merge duplicate keyframes.
	t.deepEquals(toArray(samplerA.getInput()), [0, 2, 3, 4, 5, 6], 'STEP input');
	t.deepEquals(toArray(samplerA.getOutput()), [1, 1, 1, 1, 1, 2, 1, 3, 1, 4, 1, 5], 'STEP output');

	// Merge colinear keyframes.
	t.deepEquals(toArray(samplerB.getInput()), [0, 2, 6], 'LINEAR input');
	t.deepEquals(toArray(samplerB.getOutput()), [1, 1, 1, 1, 1, 5], 'LINEAR output');

	// No change.
	t.deepEquals(toArray(samplerC.getInput()), Array.from(inArray), 'CUBICSPLINE input (unchanged)');
	t.deepEquals(toArray(samplerC.getOutput()), Array.from(outSplineArray), 'CUBICSPLINE output (unchanged)');
	t.end();
});

function toArray(accessor: Accessor): number[] {
	return Array.from(accessor.getArray());
}
