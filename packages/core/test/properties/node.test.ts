require('source-map-support').install();

import test from 'tape';
import { Document, MathUtils, NodeIO, mat4, vec3, vec4 } from '../../';

test('@gltf-transform/core::node | parent', (t) => {
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

test('@gltf-transform/core::node | copy', (t) => {
	const doc = new Document();
	const node = doc
		.createNode('MyNode')
		.setTranslation([1, 2, 3])
		.setRotation([1, 0, 1, 0])
		.setScale([2, 2, 2])
		.setWeights([1.5, 1.5])
		.setCamera(doc.createCamera())
		.setMesh(doc.createMesh())
		.setSkin(doc.createSkin())
		.addChild(doc.createNode('OtherNode'));

	// TODO(cleanup): Is this behavior reasonable?
	t.throws(() => doc.createNode().copy(node), /Node cannot be copied/, 'cannot copy node');
	// t.equals(node2.getName(), 'MyNode', 'copy name');
	// t.deepEqual(node2.getTranslation(), [1, 2, 3], 'copy translation');
	// t.deepEqual(node2.getRotation(), [1, 0, 1, 0], 'copy rotation');
	// t.deepEqual(node2.getScale(), [2, 2, 2], 'copy scale');
	// t.deepEqual(node2.getWeights(), [1.5, 1.5], 'copy weights');

	// t.equals(node2.getCamera(), node.getCamera(), 'copy camera');
	// t.equals(node2.getMesh(), node.getMesh(), 'copy mesh');
	// t.equals(node2.getSkin(), node.getSkin(), 'copy skin');
	// t.deepEquals(node2.listChildren(), [], "don't copy children");
	// t.deepEquals(node.listChildren().length, 1, 'retain children');

	t.end();
});

test('@gltf-transform/core::node | traverse', (t) => {
	const doc = new Document();
	const disposed = doc.createNode('Four');
	const node = doc
		.createNode('One')
		.addChild(doc.createNode('Two').addChild(doc.createNode('Three').addChild(disposed)));
	disposed.dispose();

	let count = 0;
	node.traverse((_) => count++);
	t.equal(count, 3, 'traverses all nodes');

	t.end();
});

test('@gltf-transform/core::node | getWorldMatrix', (t) => {
	const doc = new Document();
	const a = doc.createNode('A').setTranslation([10, 0, 0]);
	const b = doc.createNode('B').setTranslation([0, 5, 0]);
	a.addChild(b);

	t.deepEquals(b.getWorldTranslation(), [10, 5, 0], 'inherit translated position');
	t.deepEquals(b.getWorldRotation(), [0, 0, 0, 1], 'default rotation');
	t.deepEquals(b.getWorldScale(), [1, 1, 1], 'default scale');
	t.deepEquals(b.getWorldMatrix(), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 5, 0, 1], 'getWorldMatrix');

	b.setTranslation([0, 0, 1]);
	a.setTranslation([0, 0, 0]).setRotation([0.7071, 0, 0.7071, 0]);

	const pos = b.getWorldTranslation();
	t.deepEquals(pos[0].toFixed(3), '1.000', 'inherit rotated position.x');
	t.deepEquals(pos[1].toFixed(3), '0.000', 'inherit rotated position.y');
	t.deepEquals(pos[2].toFixed(3), '0.000', 'inherit rotated position.z');

	t.end();
});

test('@gltf-transform/core::node | setMatrix', (t) => {
	const doc = new Document();
	const node = doc.createNode('A').setTranslation([99, 99, 99]);

	const pos = [1, 2, 3] as vec3;
	const rot = [0, 0, 0, 1] as vec4;
	const scl = [10, 10, 10] as vec3;
	const mat = MathUtils.compose(pos, rot, scl, [] as unknown as mat4);

	node.setMatrix(mat);

	const posOut = node.getTranslation().map((v) => v.toFixed(1));
	const rotOut = node.getRotation().map((v) => v.toFixed(1));
	const sclOut = node.getScale().map((v) => v.toFixed(1));

	t.deepEquals(posOut, ['1.0', '2.0', '3.0'], 'translation');
	t.deepEquals(rotOut, ['0.0', '0.0', '0.0', '1.0'], 'rotation');
	t.deepEquals(sclOut, ['10.0', '10.0', '10.0'], 'scale');
	t.end();
});

test('@gltf-transform/core::node | extras', (t) => {
	const io = new NodeIO();
	const doc = new Document();
	doc.createNode('A').setExtras({ foo: 1, bar: 2 });

	const doc2 = io.readJSON(io.writeJSON(doc, { basename: 'test' }));

	t.deepEqual(doc.getRoot().listNodes()[0].getExtras(), { foo: 1, bar: 2 }, 'stores extras');
	t.deepEqual(doc2.getRoot().listNodes()[0].getExtras(), { foo: 1, bar: 2 }, 'roundtrips extras');

	t.end();
});

test('@gltf-transform/core::node | identity transforms', (t) => {
	const io = new NodeIO();
	const doc = new Document();

	doc.createNode('A');
	doc.createNode('B').setTranslation([1, 2, 1]);
	doc.createNode('C').setTranslation([1, 2, 1]).setRotation([1, 0, 0, 0]).setScale([1, 2, 1]);

	const { nodes } = io.writeJSON(doc, { basename: 'test' }).json;

	const a = nodes.find((n) => n.name === 'A');
	const b = nodes.find((n) => n.name === 'B');
	const c = nodes.find((n) => n.name === 'C');

	console.warn(b);

	t.deepEqual(
		a,
		{
			name: 'A',
		},
		'exclude identity transforms'
	);

	t.deepEqual(
		b,
		{
			name: 'B',
			translation: [1, 2, 1],
		},
		'has only set transform info'
	);

	t.deepEqual(
		c,
		{
			name: 'C',
			translation: [1, 2, 1],
			rotation: [1, 0, 0, 0],
			scale: [1, 2, 1],
		},
		'has transform info'
	);

	t.end();
});
