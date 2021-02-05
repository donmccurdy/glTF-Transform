require('source-map-support').install();

import test from 'tape';
import { uuid } from '../../';

test('@gltf-transform/core::uuid', t => {
	const set = new Set();
	for (let i = 0; i < 1000; i++) {
		set.add(uuid());
	}
	t.equals(set.size, 1000, 'generates 1000 unique IDs');
	t.end();
});

test('@gltf-transform/core::uuid | conflict', t => {
	const {random} = Math;

	// Number of elements must match ID length.
	const values = [
		.12, .22, .32, .42, .52, .62,
		.11, .21, .31, .41, .51, .61,
		.10, .20, .30, .40, .50, .60,
		.10, .20, .30, .40, .50, .60,
	];
	Math.random = (): number => values.pop();

	const set = new Set();
	for (let i = 0; i < 3; i++) {
		set.add(uuid());
	}
	t.equals(set.size, 3, 'generates 3 unique IDs');

	Math.random = random;
	t.end();
});
