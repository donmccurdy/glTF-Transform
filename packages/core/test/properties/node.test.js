require('source-map-support').install();

const test = require('tape');
const { Document } = require('../../');

test('@gltf-transform/core::node | copy', t => {
	const doc = new Document();
	const node = doc.createNode('MyNode')
		.setTranslation([1, 2, 3])
		.setRotation([1, 0, 1, 0])
		.setScale([2, 2, 2])
		.setWeights([1.5, 1.5])
		.setCamera(doc.createCamera())
		.setMesh(doc.createMesh())
		.setSkin(doc.createSkin())
		.addChild(doc.createNode('OtherNode'));

	const node2 = doc.createNode().copy(node);
	t.equals(node2.getName(), 'MyNode', 'copy name');
	t.deepEqual(node2.getTranslation(), [1, 2, 3], 'copy translation');
	t.deepEqual(node2.getRotation(), [1, 0, 1, 0], 'copy rotation');
	t.deepEqual(node2.getScale(), [2, 2, 2], 'copy scale');
	t.deepEqual(node2.getWeights(), [1.5, 1.5], 'copy weights');

	t.equals(node2.getCamera(), node.getCamera(), 'copy camera');
	t.equals(node2.getMesh(), node.getMesh(), 'copy mesh');
	t.equals(node2.getSkin(), node.getSkin(), 'copy skin');
	t.equals(node2.listChildren()[0], node.listChildren()[0], 'copy children');

	t.end();
});

test('@gltf-transform/core::node | traverse', t => {
	const doc = new Document();
	const disposed = doc.createNode('Four');
	const node = doc.createNode('One')
		.addChild(doc.createNode('Two')
			.addChild(doc.createNode('Three').addChild(disposed)));
	disposed.dispose();

	let count = 0;
	node.traverse((_) => count++);
	t.equal(count, 3, 'traverses all nodes')

	t.end();
});
