require('source-map-support').install();

const test = require('tape');
const { Container } = require('../');

test('@gltf-transform/core::container | transform', t => {
	const container = new Container();

	container.transform(
		(c) => c.createTexture(''),
		(c) => c.createBuffer(''),
	);

	t.equals(container.getRoot().listTextures().length, 1, 'transform 1');
	t.equals(container.getRoot().listBuffers().length, 1, 'transform 2');

	t.end();
});
