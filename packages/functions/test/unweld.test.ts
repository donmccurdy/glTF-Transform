import test from 'ava';
import { Accessor, Document, Primitive } from '@gltf-transform/core';
import { unweld } from '@gltf-transform/functions';

test('basic', async (t) => {
	const doc = new Document();
	const positionArray = new Float32Array([0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 1, 0, 0, -1, 0, 1, 0, 0, -1, 0, 0]);
	const position = doc.createAccessor().setType(Accessor.Type.VEC3).setArray(positionArray);
	const indices1 = doc.createAccessor().setArray(new Uint32Array([0, 3, 5, 0, 3, 6]));
	const indices2 = doc.createAccessor().setArray(new Uint32Array([0, 3, 5, 1, 4, 5]));
	const prim1 = doc
		.createPrimitive()
		.setIndices(indices1)
		.setAttribute('POSITION', position)
		.setMode(Primitive.Mode.TRIANGLES);
	const prim2 = doc
		.createPrimitive()
		.setIndices(indices2)
		.setAttribute('POSITION', position)
		.setMode(Primitive.Mode.TRIANGLES);
	const prim3 = doc.createPrimitive().setAttribute('POSITION', position).setMode(Primitive.Mode.TRIANGLE_FAN);
	doc.createMesh().addPrimitive(prim1).addPrimitive(prim2).addPrimitive(prim3);

	await doc.transform(unweld());

	t.is(prim1.getIndices(), null, 'no index on prim1');
	t.is(prim2.getIndices(), null, 'no index on prim2');
	t.is(prim3.getIndices(), null, 'no index on prim3');

	t.deepEqual(
		prim1.getAttribute('POSITION').getArray(),
		new Float32Array([0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, -1, 0, 0]),
		'subset of vertices in prim1'
	);
	t.deepEqual(
		prim2.getAttribute('POSITION').getArray(),
		new Float32Array([0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, -1, 0, 1, 0, 0]),
		'subset of vertices in prim2'
	);
	t.deepEqual(prim3.getAttribute('POSITION').getArray(), positionArray, 'original vertices in prim3');
	t.is(doc.getRoot().listAccessors().length, 3, 'keeps only needed accessors');
});
