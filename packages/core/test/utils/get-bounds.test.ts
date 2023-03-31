import test from 'ava';
import { Accessor, Document } from '@gltf-transform/core';
import { getBounds } from '@gltf-transform/core';

test('@gltf-transform/functions::getBounds', (t) => {
	const document = new Document();
	const position = document
		.createAccessor()
		.setArray(new Float32Array([0, 0, 0, 1, 1, 1]))
		.setType(Accessor.Type.VEC3);
	const prim = document.createPrimitive().setAttribute('POSITION', position);
	const mesh = document.createMesh().addPrimitive(prim);
	const node = document.createNode().setMesh(mesh).setTranslation([100, 100, 100]).setScale([5, 5, 5]);
	const scene = document.createScene().addChild(node);

	t.deepEqual(
		getBounds(scene),
		{
			min: [100, 100, 100],
			max: [105, 105, 105],
		},
		'computes world bounds'
	);
});
