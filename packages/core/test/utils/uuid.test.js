require('source-map-support').install();

const test = require('tape');
const { uuid } = require('../../');

test('@gltf-transform/core::uuid', t => {
	const set = new Set();
	for (let i = 0; i < 1000; i++) {
		set.add(uuid());
	}
	t.equals(set.size, 1000, 'generates 1000 unique IDs');
	t.end();
});
