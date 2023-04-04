import test from 'ava';
import { Accessor, Document, GLTF, Primitive, Property, VertexLayout } from '@gltf-transform/core';
import { createPlatformIO } from '@gltf-transform/test-utils';

test('basic', (t) => {
	const document = new Document();
	const mesh = document.createMesh('mesh');
	const prim = document.createPrimitive();

	mesh.addPrimitive(prim);
	t.deepEqual(mesh.listPrimitives(), [prim], 'adds primitive');

	mesh.removePrimitive(prim);
	t.deepEqual(mesh.listPrimitives(), [], 'removes primitive');
});

test('primitive', (t) => {
	const document = new Document();
	const prim = document.createPrimitive();
	const acc1 = document.createAccessor('acc1');
	const acc2 = document.createAccessor('acc2');
	const acc3 = document.createAccessor('acc3');

	const toType = (p: Property): string => p.propertyType;

	prim.setAttribute('POSITION', acc1);
	t.is(prim.getAttribute('POSITION'), acc1, 'sets POSITION');
	t.deepEqual(acc1.listParents().map(toType), ['Root', 'Primitive'], 'links POSITION');

	prim.setAttribute('NORMAL', acc2);
	t.is(prim.getAttribute('NORMAL'), acc2, 'sets NORMAL');
	t.deepEqual(acc1.listParents().map(toType), ['Root', 'Primitive'], 'links NORMAL');
	t.deepEqual(acc2.listParents().map(toType), ['Root', 'Primitive'], 'links NORMAL');

	prim.setAttribute('POSITION', acc3);
	t.is(prim.getAttribute('POSITION'), acc3, 'overwrites POSITION');
	t.deepEqual(acc1.listParents().map(toType), ['Root'], 'unlinks old POSITION');
	t.deepEqual(acc3.listParents().map(toType), ['Root', 'Primitive'], 'links new POSITION');

	prim.setAttribute('POSITION', null);
	t.is(prim.getAttribute('POSITION'), null, 'deletes POSITION');
	t.deepEqual(acc3.listParents().map(toType), ['Root'], 'unlinks old POSITION');
});

test('primitive targets', async (t) => {
	const document = new Document();
	const mesh = document.createMesh('mesh');
	const prim = document.createPrimitive();
	const trg1 = document.createPrimitiveTarget('trg1');
	const trg2 = document.createPrimitiveTarget('trg2');
	const trg3 = document.createPrimitiveTarget('trg3');
	const acc1 = document.createAccessor('acc1');
	const acc2 = document.createAccessor('acc2');
	const acc3 = document.createAccessor('acc3');
	const buf = document.createBuffer('buf');

	trg1.setAttribute('POSITION', acc1.setArray(new Float32Array([0, 0, 0])).setBuffer(buf));
	trg2.setAttribute('POSITION', acc2.setArray(new Float32Array([0, 0, 0])).setBuffer(buf));
	trg3.setAttribute('POSITION', acc3.setArray(new Float32Array([0, 0, 0])).setBuffer(buf));

	prim.addTarget(trg1).addTarget(trg2).addTarget(trg3);

	mesh.addPrimitive(prim);

	const toType = (p: Property): string => p.propertyType;

	t.deepEqual(acc1.listParents().map(toType), ['Root', 'PrimitiveTarget'], 'links target attributes');
	t.deepEqual(acc2.listParents().map(toType), ['Root', 'PrimitiveTarget'], 'links target attributes');
	t.deepEqual(acc3.listParents().map(toType), ['Root', 'PrimitiveTarget'], 'links target attributes');

	t.deepEqual(prim.listTargets(), [trg1, trg2, trg3], 'links targets');
	t.deepEqual(trg1.listParents().map(toType), ['Primitive'], 'links targets');

	const io = await createPlatformIO();
	const options = { basename: 'targetTest' };
	const jsonDoc = await io.writeJSON(await io.readJSON(await io.writeJSON(document, options)), options);
	const meshDef = jsonDoc.json.meshes[0];

	t.deepEqual(meshDef.extras.targetNames, ['trg1', 'trg2', 'trg3'], 'writes target names');
	t.deepEqual(
		meshDef.primitives[0].targets,
		[{ POSITION: 0 }, { POSITION: 1 }, { POSITION: 2 }],
		'writes target accessors'
	);
});

test('copy', (t) => {
	const document = new Document();
	const mesh = document.createMesh('mesh').setWeights([1, 2, 3]).addPrimitive(document.createPrimitive());
	const mesh2 = document.createMesh().copy(mesh);

	t.deepEqual(mesh2.getWeights(), mesh.getWeights(), 'copy weights');
	t.deepEqual(mesh2.listPrimitives(), mesh.listPrimitives(), 'copy primitives');
});

test('copy primitive', (t) => {
	const document = new Document();
	const prim = document
		.createPrimitive()
		.setAttribute('POSITION', document.createAccessor())
		.setIndices(document.createAccessor())
		.setMode(3)
		.setMaterial(document.createMaterial())
		.addTarget(document.createPrimitiveTarget())
		.addTarget(document.createPrimitiveTarget());
	const prim2 = document.createPrimitive().copy(prim);

	t.is(prim2.getAttribute('POSITION'), prim2.getAttribute('POSITION'), 'copy attributes');
	t.is(prim2.getIndices(), prim.getIndices(), 'copy indices');
	t.is(prim2.getMode(), prim.getMode(), 'copy mode');
	t.is(prim2.getMaterial(), prim.getMaterial(), 'copy material');
	t.deepEqual(prim2.listTargets(), prim.listTargets(), 'copy targets');
});

test('extras', async (t) => {
	const io = await createPlatformIO();
	const doc = new Document();
	doc.createMesh('A')
		.setExtras({ foo: 1, bar: 2 })
		.addPrimitive(doc.createPrimitive().setExtras({ baz: 3 }));

	const doc2 = await io.readJSON(await io.writeJSON(doc, { basename: 'test' }));

	t.deepEqual(doc.getRoot().listMeshes()[0].getExtras(), { foo: 1, bar: 2 }, 'stores mesh extras');
	t.deepEqual(doc2.getRoot().listMeshes()[0].getExtras(), { foo: 1, bar: 2 }, 'roundtrips mesh extras');

	const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
	const prim2 = doc2.getRoot().listMeshes()[0].listPrimitives()[0];
	t.deepEqual(prim.getExtras(), { baz: 3 }, 'stores prim extras');
	t.deepEqual(prim2.getExtras(), { baz: 3 }, 'roundtrips prim extras');
});

test('empty i/o', async (t) => {
	// Technically meshes must have primitives for the file to be valid, but we'll test that
	// reading/writing works anyway.

	const document = new Document();
	document.createMesh('EmptyMesh').setWeights([1, 0, 0, 0]);

	const io = await createPlatformIO();
	let rtDocument = await io.readJSON(await io.writeJSON(document, {}));
	let rtMesh = rtDocument.getRoot().listMeshes()[0];

	t.deepEqual(rtMesh.listPrimitives(), [], 'primitives');
	t.deepEqual(rtMesh.getName(), 'EmptyMesh', 'name');
	t.deepEqual(rtMesh.getWeights(), [1, 0, 0, 0], 'weights');

	rtDocument = await io.readJSON({
		json: {
			asset: { version: '2.0' },
			meshes: [
				{
					name: 'EmptyMesh.2',
					weights: [0, 0, 1, 0],
				} as unknown as GLTF.IMesh,
			],
		},
		resources: {},
	});
	rtMesh = rtDocument.getRoot().listMeshes()[0];

	t.deepEqual(rtMesh.listPrimitives(), [], 'primitives');
	t.deepEqual(rtMesh.getName(), 'EmptyMesh.2', 'name');
	t.deepEqual(rtMesh.getWeights(), [0, 0, 1, 0], 'weights');
});

test('primitive i/o', async (t) => {
	const document = new Document();
	const prim = document.createPrimitive();
	const buffer = document.createBuffer();

	prim.setMode(Primitive.Mode.POINTS)
		.setAttribute(
			'POSITION',
			document
				.createAccessor()
				.setArray(new Float32Array([0, 0, 0]))
				.setType(Accessor.Type.VEC3)
				.setBuffer(buffer)
		)
		.setAttribute(
			'COLOR_0',
			document
				.createAccessor()
				.setArray(new Uint8Array([128, 128, 128]))
				.setType(Accessor.Type.VEC3)
				.setBuffer(buffer)
		)
		.setAttribute(
			'COLOR_1',
			document
				.createAccessor()
				.setArray(new Uint16Array([64, 64, 64]))
				.setType(Accessor.Type.VEC3)
				.setBuffer(buffer)
		)
		.setAttribute(
			'COLOR_2',
			document
				.createAccessor()
				.setArray(new Uint32Array([32, 32, 32]))
				.setType(Accessor.Type.VEC3)
				.setBuffer(buffer)
		)
		.setAttribute(
			'COLOR_3',
			document
				.createAccessor()
				.setArray(new Int16Array([16, 16, 16]))
				.setType(Accessor.Type.VEC3)
				.setBuffer(buffer)
		)
		.setAttribute(
			'COLOR_4',
			document
				.createAccessor()
				.setArray(new Int8Array([8, 8, 8]))
				.setType(Accessor.Type.VEC3)
				.setBuffer(buffer)
		);

	document.createMesh().addPrimitive(prim);

	const io = await createPlatformIO();
	const rtDocument = await io.readBinary(await io.writeBinary(document));
	const rtPrim = rtDocument.getRoot().listMeshes()[0].listPrimitives()[0];

	t.deepEqual(rtPrim.getAttribute('POSITION').getArray(), new Float32Array([0, 0, 0]), 'float32');
	t.deepEqual(rtPrim.getAttribute('COLOR_0').getArray(), new Uint8Array([128, 128, 128]), 'uint8');
	t.deepEqual(rtPrim.getAttribute('COLOR_1').getArray(), new Uint16Array([64, 64, 64]), 'uint16');
	t.deepEqual(rtPrim.getAttribute('COLOR_2').getArray(), new Uint32Array([32, 32, 32]), 'uint32');
	t.deepEqual(rtPrim.getAttribute('COLOR_3').getArray(), new Int16Array([16, 16, 16]), 'int8');
	t.deepEqual(rtPrim.getAttribute('COLOR_4').getArray(), new Int8Array([8, 8, 8]), 'int8');
});

test('primitive vertex layout', async (t) => {
	const document = new Document();
	const prim = document.createPrimitive();
	const buffer = document.createBuffer();

	prim.setMode(Primitive.Mode.POINTS)
		.setAttribute(
			'POSITION',
			document
				.createAccessor()
				.setArray(new Float32Array([0, 0, 0]))
				.setType(Accessor.Type.VEC3)
				.setBuffer(buffer)
		)
		.setAttribute(
			'COLOR_0',
			document
				.createAccessor()
				.setArray(new Uint8Array([128, 128, 128]))
				.setType(Accessor.Type.VEC3)
				.setBuffer(buffer)
		)
		.setAttribute(
			'COLOR_1',
			document
				.createAccessor()
				.setArray(new Uint16Array([64, 64, 64]))
				.setType(Accessor.Type.VEC3)
				.setBuffer(buffer)
		)
		.setAttribute(
			'COLOR_2',
			document
				.createAccessor()
				.setArray(new Uint32Array([32, 32, 32]))
				.setType(Accessor.Type.VEC3)
				.setBuffer(buffer)
		);

	document.createMesh().addPrimitive(prim);

	const io = await createPlatformIO();

	io.setVertexLayout(VertexLayout.INTERLEAVED);
	const interleavedJSON = await io.binaryToJSON(await io.writeBinary(document));
	t.deepEqual(
		interleavedJSON.json.bufferViews,
		[{ buffer: 0, target: 34962, byteOffset: 0, byteLength: 36, byteStride: 36 }],
		'interleaved buffer byte length'
	);

	io.setVertexLayout(VertexLayout.SEPARATE);
	const separateJSON = await io.binaryToJSON(await io.writeBinary(document));
	t.deepEqual(
		separateJSON.json.bufferViews,
		[
			{ buffer: 0, target: 34962, byteOffset: 0, byteLength: 12, byteStride: 12 },
			{ buffer: 0, target: 34962, byteOffset: 12, byteLength: 4, byteStride: 4 },
			{ buffer: 0, target: 34962, byteOffset: 16, byteLength: 8, byteStride: 8 },
			{ buffer: 0, target: 34962, byteOffset: 24, byteLength: 12, byteStride: 12 },
		],
		'separate buffer byte length'
	);
});
