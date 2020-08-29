require('source-map-support').install();

const test = require('tape');
const { Document } = require('../../');

test('@gltf-transform/core::node | parent', t => {
	const doc = new Document();
	const a = doc.createNode('A');
	const b = doc.createNode('B');
	const c = doc.createNode('C');

	a.addChild(c);
	b.addChild(c);

	t.deepEquals(a.listChildren(), [], 'removes child from 1st parent');
	t.deepEquals(b.listChildren(), [c], 'adds child to 2nd parent');

	t.end();
});

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
	t.deepEquals(node2.listChildren(), [], 'don\'t copy children');
	t.deepEquals(node.listChildren().length, 1, 'retain children');

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

test('@gltf-transform/core::node | getWorldMatrix', t => {
	const doc = new Document();
	const a = doc.createNode('A').setTranslation([10, 0, 0]);
	const b = doc.createNode('B').setTranslation([0, 5, 0]);
	a.addChild(b);

	t.deepEquals(b.getWorldTranslation(), [10, 5, 0], 'getWorldTranslation');
	t.deepEquals(b.getWorldRotation(), [0, 0, 0, 1], 'getWorldRotation');
	t.deepEquals(b.getWorldScale(), [1, 1, 1], 'getWorldScale');
	t.deepEquals(b.getWorldMatrix(), [
		10, 0, 0, 0,
		0, 5, 0, 0,
		0, 0, 0, 0,
	], 'getWorldMatrix');

	t.end();
});
