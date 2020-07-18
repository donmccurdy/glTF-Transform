require('source-map-support').install();

const test = require('tape');
const { Document } = require('../../');

test('@gltf-transform/core::scene | copy', t => {
	const doc = new Document();
	const scene = doc.createScene('MyScene')
		.addNode(doc.createNode('Node1'))
		.addNode(doc.createNode('Node2'));

	const scene2 = doc.createScene().copy(scene);
	t.equals(scene2.getName(), 'MyScene', 'copy name');
	t.deepEqual(scene2.listNodes(), scene.listNodes(), 'copy nodes');
	t.end();
});
