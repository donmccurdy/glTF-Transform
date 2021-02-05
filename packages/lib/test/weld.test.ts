require('source-map-support').install();

import test from 'tape';
import { Accessor, Document, Primitive } from '@gltf-transform/core';
import { weld } from '../';

test('@gltf-transform/lib::weld | tolerance=0', async t => {
	const doc = new Document();
	const positionArray = new Float32Array([
		0, 0, 0,
		0, 0, 1,
		0, 0, -1,
		0, 0, 0,
		0, 0, 1,
		0, 0, -1,
	]);
	const position = doc.createAccessor()
		.setType(Accessor.Type.VEC3)
		.setArray(positionArray);
	const indices = doc.createAccessor()
		.setArray(new Uint32Array([
			3, 4, 5,
			0, 1, 2,
		]));
	const prim1 = doc.createPrimitive()
		.setAttribute('POSITION', position)
		.setMode(Primitive.Mode.TRIANGLES);
	const prim2 = doc.createPrimitive()
		.setIndices(indices)
		.setAttribute('POSITION', position)
		.setMode(Primitive.Mode.TRIANGLES);
	doc.createMesh()
		.addPrimitive(prim1)
		.addPrimitive(prim2);

	await doc.transform(weld({tolerance: 0}));

	t.deepEquals(
		prim1.getIndices().getArray(),
		new Uint32Array([0, 1, 2, 3, 4, 5]),
		'indices on prim1'
	);
	t.deepEquals(
		prim2.getIndices().getArray(),
		new Uint32Array([3, 4, 5, 0, 1, 2]),
		'indices on prim2'
	);
	t.deepEquals(
		prim1.getAttribute('POSITION').getArray(),
		positionArray,
		'vertices on prim1'
	);
	t.deepEquals(
		prim2.getAttribute('POSITION').getArray(),
		positionArray,
		'vertices on prim2'
	);
	t.end();
});

test('@gltf-transform/lib::weld | tolerance>0', async t => {
	const doc = new Document();
	const positionArray = new Float32Array([
		0, 0, 0,
		0, 0, 1,
		0, 0, -1,
		0, 0, 0,
		0, 0, 1,
		0, 0, -1,
	]);
	const positionTargetArray = new Float32Array([
		0, 10, 0,
		0, 10, 1,
		0, 10, -1,
		0, 15, 0,
		0, 15, 1,
		0, 15, -1,
	]);
	const position = doc.createAccessor()
		.setType(Accessor.Type.VEC3)
		.setArray(positionArray);
	const positionTarget = doc.createAccessor()
		.setType(Accessor.Type.VEC3)
		.setArray(positionTargetArray);

	const prim1 = doc.createPrimitive()
		.setAttribute('POSITION', position)
		.setMode(Primitive.Mode.TRIANGLES);

	const prim2Indices = doc.createAccessor()
		.setArray(new Uint32Array([
			3, 4, 5,
			0, 1, 2,
		]));
	const prim2Target = doc.createPrimitiveTarget()
		.setAttribute('POSITION', positionTarget);
	const prim2 = doc.createPrimitive()
		.setIndices(prim2Indices)
		.setAttribute('POSITION', position)
		.setMode(Primitive.Mode.TRIANGLES)
		.addTarget(prim2Target);
	doc.createMesh()
		.addPrimitive(prim1)
		.addPrimitive(prim2);

	await doc.transform(weld({tolerance: 1e-8}));

	t.deepEquals(
		prim1.getIndices().getArray(),
		new Uint32Array([0, 1, 2, 0, 1, 2]),
		'indices on prim1'
	);
	t.deepEquals(
		prim2.getIndices().getArray(),
		new Uint32Array([0, 1, 2, 0, 1, 2]),
		'indices on prim2'
	);
	t.deepEquals(
		prim1.getAttribute('POSITION').getArray(),
		positionArray.slice(0, 9),
		'vertices on prim1'
	);
	t.deepEquals(
		prim2.getAttribute('POSITION').getArray(),
		positionArray.slice(0, 9),
		'vertices on prim2'
	);
	t.deepEquals(
		prim2.listTargets()[0].getAttribute('POSITION').getArray(),
		positionTargetArray.slice(9, 18), // Uses later targets, because of index order.
		'morph targets on prim2'
	);
	t.equals(doc.getRoot().listAccessors().length, 5, 'keeps only needed accessors');
	t.end();
});
