import test from 'ava';
import { Accessor, Document, Primitive } from '@gltf-transform/core';
import { getBounds } from '@gltf-transform/core';

test('unindexed', (t) => {
	const document = new Document();
	const position = document
		.createAccessor()
		.setArray(new Float32Array([0, 0, 0, 1, 1, 1]))
		.setType(Accessor.Type.VEC3);
	const prim = document.createPrimitive().setMode(Primitive.Mode.POINTS).setAttribute('POSITION', position);
	const mesh = document.createMesh().addPrimitive(prim);
	const node = document.createNode().setMesh(mesh).setTranslation([100, 100, 100]).setScale([5, 5, 5]);
	const scene = document.createScene().addChild(node);

	t.deepEqual(
		getBounds(scene),
		{
			min: [100, 100, 100],
			max: [105, 105, 105],
		},
		'computes world bounds',
	);
});

test('indexed', (t) => {
	const document = new Document();
	const position = document
		.createAccessor()
		.setArray(new Float32Array([10, 15, 20, 0, 0, 0, 1, 2, 3]))
		.setType(Accessor.Type.VEC3);
	const indices = document.createAccessor().setArray(new Uint16Array([1, 2]));
	const prim = document
		.createPrimitive()
		.setMode(Primitive.Mode.POINTS)
		.setIndices(indices)
		.setAttribute('POSITION', position);
	const mesh = document.createMesh().addPrimitive(prim);
	const node = document.createNode().setMesh(mesh);
	const scene = document.createScene().addChild(node);

	t.deepEqual(
		getBounds(scene),
		{
			min: [0, 0, 0],
			max: [1, 2, 3],
		},
		'computes world bounds',
	);
});
