require('source-map-support').install();

import test from 'tape';
import { Accessor, Document } from '@gltf-transform/core';
import { bounds } from '../';

test('@gltf-transform/lib::bounds', t => {

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

	t.deepEquals(bounds(scene), {
		min: [100, 100, 100],
		max: [105, 105, 105],
	}, 'computes world bounds');

	t.end();
});
