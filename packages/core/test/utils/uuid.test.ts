import test from 'ava';
import { uuid } from '@gltf-transform/core';

test('basic', (t) => {
	const set = new Set();
	for (let i = 0; i < 1000; i++) {
		set.add(uuid());
	}
	t.is(set.size, 1000, 'generates 1000 unique IDs');
});

test('conflict', (t) => {
	const { random } = Math;

	// Number of elements must match ID length.
	const values = [
		0.12, 0.22, 0.32, 0.42, 0.52, 0.62, 0.11, 0.21, 0.31, 0.41, 0.51, 0.61, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.1, 0.2,
		0.3, 0.4, 0.5, 0.6,
	];
	Math.random = (): number => values.pop();

	const set = new Set();
	for (let i = 0; i < 3; i++) {
		set.add(uuid());
	}
	t.is(set.size, 3, 'generates 3 unique IDs');

	Math.random = random;
});
