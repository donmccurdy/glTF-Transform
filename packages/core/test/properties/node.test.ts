import test from 'ava';
import { createPlatformIO } from '../../../test-utils';
import { Document, MathUtils, mat4, vec3, vec4 } from '@gltf-transform/core';

test('@gltf-transform/core::node | parent', (t) => {
	const doc = new Document();
	const a = doc.createNode('A');
	const b = doc.createNode('B');
	const c = doc.createNode('C');

	a.addChild(c);
	b.addChild(c);

	t.deepEqual(a.listChildren(), [], 'removes child from 1st parent');
	t.deepEqual(b.listChildren(), [c], 'adds child to 2nd parent');
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

	// See {@link Node.copy}.
	t.throws(() => doc.createNode().copy(node), { message: /Node cannot be copied/i }, 'cannot copy node');
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
	t.is(count, 3, 'traverses all nodes');
});

test('@gltf-transform/core::node | getWorldMatrix', (t) => {
	const doc = new Document();
	const a = doc.createNode('A').setTranslation([10, 0, 0]);
	const b = doc.createNode('B').setTranslation([0, 5, 0]);
	a.addChild(b);

	t.deepEqual(b.getWorldTranslation(), [10, 5, 0], 'inherit translated position');
	t.deepEqual(b.getWorldRotation(), [0, 0, 0, 1], 'default rotation');
	t.deepEqual(b.getWorldScale(), [1, 1, 1], 'default scale');
	t.deepEqual(b.getWorldMatrix(), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 5, 0, 1], 'getWorldMatrix');

	b.setTranslation([0, 0, 1]);
	a.setTranslation([0, 0, 0]).setRotation([0.7071, 0, 0.7071, 0]);

	const pos = b.getWorldTranslation();
	t.deepEqual(pos[0].toFixed(3), '1.000', 'inherit rotated position.x');
	t.deepEqual(pos[1].toFixed(3), '0.000', 'inherit rotated position.y');
	t.deepEqual(pos[2].toFixed(3), '0.000', 'inherit rotated position.z');
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

	t.deepEqual(posOut, ['1.0', '2.0', '3.0'], 'translation');
	t.deepEqual(rotOut, ['0.0', '0.0', '0.0', '1.0'], 'rotation');
	t.deepEqual(sclOut, ['10.0', '10.0', '10.0'], 'scale');
});

test('@gltf-transform/core::node | extras', async (t) => {
	const io = await createPlatformIO();
	const doc = new Document();
	doc.createNode('A').setExtras({ foo: 1, bar: 2 });

	const doc2 = await io.readJSON(await io.writeJSON(doc, { basename: 'test' }));

	t.deepEqual(doc.getRoot().listNodes()[0].getExtras(), { foo: 1, bar: 2 }, 'stores extras');
	t.deepEqual(doc2.getRoot().listNodes()[0].getExtras(), { foo: 1, bar: 2 }, 'roundtrips extras');
});

test('@gltf-transform/core::node | identity transforms', async (t) => {
	const io = await createPlatformIO();
	const doc = new Document();

	doc.createNode('A');
	doc.createNode('B').setTranslation([1, 2, 1]);
	doc.createNode('C').setTranslation([1, 2, 1]).setRotation([1, 0, 0, 0]).setScale([1, 2, 1]);

	const { nodes } = (await io.writeJSON(doc, { basename: 'test' })).json;

	const a = nodes.find((n) => n.name === 'A');
	const b = nodes.find((n) => n.name === 'B');
	const c = nodes.find((n) => n.name === 'C');

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
});
