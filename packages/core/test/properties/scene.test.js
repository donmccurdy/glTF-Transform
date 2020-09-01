require('source-map-support').install();

const test = require('tape');
const { Document } = require('../../');

test('@gltf-transform/core::scene | copy', t => {
	const doc = new Document();
	const scene = doc.createScene('MyScene')
		.addChild(doc.createNode('Node1'))
		.addChild(doc.createNode('Node2'));

	const scene2 = doc.createScene().copy(scene);
	t.equals(scene2.getName(), 'MyScene', 'copy name');
	t.equal(scene.listChildren().length, 2, 'retain children');
	t.deepEqual(scene2.listChildren(), [], 'don\'t copy children');
	t.end();
});

test('@gltf-transform/core::scene | traverse', t => {
	const doc = new Document();
	const scene = doc.createScene('MyScene')
		.addChild(doc.createNode('Node1'))
		.addChild(doc.createNode('Node2'));

	let count = 0;
	scene.traverse((_) => count++);
	t.equals(count, 2, 'traverses all nodes');
	t.end();
});
