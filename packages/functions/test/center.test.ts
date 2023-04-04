import test from 'ava';
import { Accessor, Document, getBounds } from '@gltf-transform/core';
import { center } from '@gltf-transform/functions';

test('basic', async (t) => {
	const doc = new Document();
	const position = doc
		.createAccessor()
		.setArray(new Float32Array([0, 0, 0, 1, 1, 1]))
		.setType(Accessor.Type.VEC3);
	const prim = doc.createPrimitive().setAttribute('POSITION', position);
	const mesh = doc.createMesh().addPrimitive(prim);
	const node = doc.createNode().setMesh(mesh).setTranslation([100, 100, 100]).setScale([5, 5, 5]);
	const scene = doc.createScene().addChild(node);

	await doc.transform(center({ pivot: 'center' }));

	t.deepEqual(
		getBounds(scene),
		{
			min: [-2.5, -2.5, -2.5],
			max: [2.5, 2.5, 2.5],
		},
		'center'
	);

	await doc.transform(center({ pivot: 'above' }));

	t.deepEqual(
		getBounds(scene),
		{
			min: [-2.5, -5.0, -2.5],
			max: [2.5, 0.0, 2.5],
		},
		'above'
	);

	await doc.transform(center({ pivot: 'below' }));

	t.deepEqual(
		getBounds(scene),
		{
			min: [-2.5, 0.0, -2.5],
			max: [2.5, 5.0, 2.5],
		},
		'below'
	);
});
