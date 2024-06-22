import test from 'ava';
import { Document } from '@gltf-transform/core';
import { sortPrimitiveWeights } from '@gltf-transform/functions';
import { round } from '@gltf-transform/test-utils';

test('unlimited weights', async (t) => {
	const prim = createSkinnedPrimitive();

	sortPrimitiveWeights(prim);

	let weights = [
		...prim.getAttribute('WEIGHTS_0')!.getElement(0, []),
		...prim.getAttribute('WEIGHTS_1')!.getElement(0, []),
	];

	t.is(sum(weights), 1, 'sum === 1, vertex #1');
	t.deepEqual(weights.map(round(2)), [0.38, 0.2, 0.15, 0.13, 0.1, 0.04, 0, 0], 'weights, vertex #1');

	// prettier-ignore
	t.deepEqual(
		[
			...prim.getAttribute('JOINTS_0')!.getElement(0, []),
			...prim.getAttribute('JOINTS_1')!.getElement(0, []),
		],
		[1, 6, 3, 5, 7, 4, 0, 0],
		'joints, vertex #1'
	);

	weights = [
		...prim.getAttribute('WEIGHTS_0')!.getElement(1, []),
		...prim.getAttribute('WEIGHTS_1')!.getElement(1, []),
	];

	t.is(sum(weights), 1, 'sum === 1, vertex #2');
	t.deepEqual(weights.map(round(2)), [0.74, 0.11, 0.11, 0.02, 0.01, 0, 0, 0], 'weights, vertex #2');

	// prettier-ignore
	t.deepEqual(
		[
			...prim.getAttribute('JOINTS_0')!.getElement(1, []),
			...prim.getAttribute('JOINTS_1')!.getElement(1, []),
		],
		[13, 12, 8, 10, 11, 0, 0, 0],
		'joints, vertex #2'
	);
});

test('limited weights', async (t) => {
	const prim = createSkinnedPrimitive();

	sortPrimitiveWeights(prim, 4);

	t.falsy(prim.getAttribute('WEIGHTS_1'), 'limit weights');
	t.falsy(prim.getAttribute('JOINTS_1'), 'limit joints');

	// prettier-ignore
	t.deepEqual(
		prim.getAttribute('WEIGHTS_0')!.getElement(0, []).map(round(2)),
		[0.44, 0.23, 0.17, 0.15],
		'weights, vertex #1 (truncated)'
	);

	// prettier-ignore
	t.deepEqual(
		prim.getAttribute('JOINTS_0')!.getElement(0, []),
		[1, 6, 3, 5],
		'joints, vertex #1 (truncated)'
	);

	// prettier-ignore
	t.deepEqual(
		prim.getAttribute('WEIGHTS_0')!.getElement(1, []).map(round(2)),
		[0.75, 0.12, 0.11, 0.02],
		'weights, vertex #2 (truncated)'
	);

	// prettier-ignore
	t.deepEqual(
		prim.getAttribute('JOINTS_0')!.getElement(1, []),
		[13, 12, 8, 10],
		'joints, vertex #2 (truncated)'
	);
});

test('invalid limits', async (t) => {
	const prim = createSkinnedPrimitive();
	t.throws(() => sortPrimitiveWeights(prim, 0), { message: /limit/i }, 'limit = 0');
	t.throws(() => sortPrimitiveWeights(prim, -1), { message: /limit/i }, 'limit < 0');
	t.throws(() => sortPrimitiveWeights(prim, 3), { message: /limit/i }, 'limit % 4 > 0');
});

function createSkinnedPrimitive() {
	const document = new Document();

	const position = new Float32Array(2 * 3);

	// prettier-ignore
	const weights0 = new Float32Array([
		0.00, 0.38, 0.00, 0.15,
		0.30, 0.00, 0.05, 0.04,
	]);
	// prettier-ignore
	const weights1 = new Float32Array([
		0.04, 0.13, 0.20, 0.10,
		0.31, 2.00, 0.00, 0.00,
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

function sum(values: number[]): number {
	let sum = 0;
	for (let i = 0; i < values.length; i++) {
		sum += values[i];
	}
	return Math.fround(sum);
}
