require('source-map-support').install();

import test from 'tape';
import { Document } from '@gltf-transform/core';
import { sortPrimitiveWeights } from '../';

test.only('@gltf-transform/functions::sortPrimitiveWeights', async (t) => {
	const prim = createSkinnedPrimitive();

	sortPrimitiveWeights(prim);

	// prettier-ignore
	t.deepEquals(
		[
			...prim.getAttribute('WEIGHTS_0')!.getElement(0, []),
			...prim.getAttribute('WEIGHTS_1')!.getElement(0, []),
		].map(round(2)),
		[0.38, 0.2, 0.15, 0.13, 0.1, 0.04, 0, 0],
		'weights, vertex #1'
	);

	// prettier-ignore
	t.deepEquals(
		[
			...prim.getAttribute('JOINTS_0')!.getElement(0, []),
			...prim.getAttribute('JOINTS_1')!.getElement(0, []),
		],
		[1, 6, 3, 5, 7, 4, 2, 0],
		'joints, vertex #1'
	);

	// prettier-ignore
	t.deepEquals(
		[
			...prim.getAttribute('WEIGHTS_0')!.getElement(1, []),
			...prim.getAttribute('WEIGHTS_1')!.getElement(1, []),
		],
		[0, 0, 0, 0, 0, 0, 0, 0],
		'weights, vertex #2'
	);

	// prettier-ignore
	t.deepEquals(
		[
			...prim.getAttribute('JOINTS_0')!.getElement(1, []),
			...prim.getAttribute('JOINTS_1')!.getElement(1, []),
		],
		[13, 12, 8, 10, 11, 15, 14, 9],
		'joints, vertex #2'
	);

	t.throws(() => sortPrimitiveWeights(prim, 0), /limit/i, 'limit = 0');
	t.throws(() => sortPrimitiveWeights(prim, -1), /limit/i, 'limit < 0');
	t.throws(() => sortPrimitiveWeights(prim, 3), /limit/i, 'limit % 4 > 0');

	sortPrimitiveWeights(prim, 4);

	t.notOk(prim.getAttribute('WEIGHTS_1'), 'limit weights');
	t.notOk(prim.getAttribute('JOINTS_1'), 'limit joints');

	// prettier-ignore
	t.deepEquals(
		prim.getAttribute('WEIGHTS_0')!.getElement(0, []).map(round(2)),
		[0.38, 0.2, 0.15, 0.13, 0.1, 0.04, 0, 0],
		'weights, vertex #1'
	);

	// prettier-ignore
	t.deepEquals(
		prim.getAttribute('JOINTS_0')!.getElement(0, []),
		[1, 6, 3, 5, 7, 4, 2, 0],
		'joints, vertex #1'
	);

	// TODO(test): vert 2/2

	t.end();
});

function createSkinnedPrimitive() {
	const document = new Document();

	const position = new Float32Array(2 * 3);

	// prettier-ignore
	const weights0 = new Float32Array([
		0, 0.38, 0, 0.15,
		0.3, 0, 0.05, 0.04,
	]);
	// prettier-ignore
	const weights1 = new Float32Array([
		0.04, 0.13, 0.2, 0.1,
		0.3, 2, 0, 0,
	]);
	// prettier-ignore
	const joints0 = new Float32Array([
		0, 1, 2, 3,
		8, 9, 10, 11,
	]);
	// prettier-ignore
	const joints1 = new Float32Array([
		4, 5, 6, 7,
		12, 13, 14, 15,
	]);

	return document
		.createPrimitive()
		.setAttribute('POSITION', document.createAccessor().setType('VEC3').setArray(position))
		.setAttribute('WEIGHTS_0', document.createAccessor().setType('VEC4').setArray(weights0))
		.setAttribute('WEIGHTS_1', document.createAccessor().setType('VEC4').setArray(weights1))
		.setAttribute('JOINTS_0', document.createAccessor().setType('VEC4').setArray(joints0))
		.setAttribute('JOINTS_1', document.createAccessor().setType('VEC4').setArray(joints1));
}

/* UTILITIES */

/** Creates a rounding function for given decimal precision. */
function round(decimals: number): (v: number) => number {
	const f = Math.pow(10, decimals);
	return (v: number) => Math.round(v * f) / f;
}
