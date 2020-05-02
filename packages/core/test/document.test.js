require('source-map-support').install();

const test = require('tape');
const { Document } = require('../');

test('@gltf-transform/core::document | transform', t => {
	const doc = new Document();

	doc.transform(
		(c) => c.createTexture(''),
		(c) => c.createBuffer(''),
	);

	t.equals(doc.getRoot().listTextures().length, 1, 'transform 1');
	t.equals(doc.getRoot().listBuffers().length, 1, 'transform 2');

	t.end();
});
