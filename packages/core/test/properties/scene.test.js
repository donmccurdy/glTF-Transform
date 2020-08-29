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

test('@gltf-transform/core::scene | traverse', t => {
	const doc = new Document();
	const scene = doc.createScene('MyScene')
		.addNode(doc.createNode('Node1'))
		.addNode(doc.createNode('Node2'));

	let count = 0;
	scene.traverse((_) => count++);
	t.equals(count, 2, 'traverses all nodes');
	t.end();
});
