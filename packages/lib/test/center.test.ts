require('source-map-support').install();

import test from 'tape';
import { Accessor, Document } from '@gltf-transform/core';
import { bounds, center } from '../';

test('@gltf-transform/lib::center', async t => {

	const doc = new Document();
	const position = doc.createAccessor()
		.setArray(new Float32Array([0, 0, 0, 1, 1, 1]))
		.setType(Accessor.Type.VEC3);
	const prim = doc.createPrimitive()
		.setAttribute('POSITION', position);
	const mesh = doc.createMesh().addPrimitive(prim);
	const node = doc.createNode()
		.setMesh(mesh)
		.setTranslation([100, 100, 100])
		.setScale([5, 5, 5]);
	const scene = doc.createScene().addChild(node);

	await doc.transform((center({pivot: 'center'})));

	t.deepEquals(bounds(scene), {
		min: [-2.5, -2.5, -2.5],
		max: [2.5, 2.5, 2.5],
	}, 'center');

	await doc.transform((center({pivot: 'above'})));

	t.deepEquals(bounds(scene), {
		min: [-2.5, -5.0, -2.5],
		max: [2.5, 0.0, 2.5],
	}, 'above');

	await doc.transform((center({pivot: 'below'})));

	t.deepEquals(bounds(scene), {
		min: [-2.5, 0.0, -2.5],
		max: [2.5, 5.0, 2.5],
	}, 'below');

	t.end();
});
