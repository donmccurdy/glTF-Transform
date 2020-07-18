require('source-map-support').install();

const test = require('tape');
const { Document } = require('../../');

test('@gltf-transform/core::root | copy', t => {
	const doc = new Document();
	const buffer = doc.createBuffer();
	const node = doc.createNode();
	const scene = doc.createScene();

	t.deepEqual(doc.getRoot().listBuffers(), [buffer], 'listBuffers()');
	t.deepEqual(doc.getRoot().listNodes(), [node], 'listNodes()');
	t.deepEqual(doc.getRoot().listScenes(), [scene], 'listScenes()');
	t.end();
});
