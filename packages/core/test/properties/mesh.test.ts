require('source-map-support').install();

import test from 'tape';
import { Accessor, Document, GLTF, NodeIO, Primitive, Property, VertexLayout } from '../../';

test('@gltf-transform/core::mesh', t => {
	const doc = new Document();
	const mesh = doc.createMesh('mesh');
	const prim = doc.createPrimitive();

	mesh.addPrimitive(prim);
	t.deepEqual(mesh.listPrimitives(), [prim], 'adds primitive');

	mesh.removePrimitive(prim);
	t.deepEqual(mesh.listPrimitives(), [], 'removes primitive');

	t.end();
});

test('@gltf-transform/core::mesh | primitive', t => {
	const doc = new Document();
	const prim = doc.createPrimitive();
	const acc1 = doc.createAccessor('acc1');
	const acc2 = doc.createAccessor('acc2');
	const acc3 = doc.createAccessor('acc3');

	const toType = (p: Property): string => p.propertyType;

	prim.setAttribute('POSITION', acc1);
	t.equals(prim.getAttribute('POSITION'), acc1, 'sets POSITION');
	t.deepEqual(acc1.listParents().map(toType), ['Root', 'Primitive'], 'links POSITION');

	prim.setAttribute('NORMAL', acc2);
	t.equals(prim.getAttribute('NORMAL'), acc2, 'sets NORMAL');
	t.deepEqual(acc1.listParents().map(toType), ['Root', 'Primitive'], 'links NORMAL');
	t.deepEqual(acc2.listParents().map(toType), ['Root', 'Primitive'], 'links NORMAL');

	prim.setAttribute('POSITION', acc3);
	t.equals(prim.getAttribute('POSITION'), acc3, 'overwrites POSITION');
	t.deepEqual(acc1.listParents().map(toType), ['Root'], 'unlinks old POSITION');
	t.deepEqual(acc3.listParents().map(toType), ['Root', 'Primitive'], 'links new POSITION');

	prim.setAttribute('POSITION', null);
	t.equals(prim.getAttribute('POSITION'), null, 'deletes POSITION');
	t.deepEqual(acc3.listParents().map(toType), ['Root'], 'unlinks old POSITION');

	t.end();
});

test('@gltf-transform/core::mesh | primitive targets', t => {
	const doc = new Document();
	const mesh = doc.createMesh('mesh');
	const prim = doc.createPrimitive();
	const trg1 = doc.createPrimitiveTarget('trg1');
	const trg2 = doc.createPrimitiveTarget('trg2');
	const trg3 = doc.createPrimitiveTarget('trg3');
	const acc1 = doc.createAccessor('acc1');
	const acc2 = doc.createAccessor('acc2');
	const acc3 = doc.createAccessor('acc3');
	const buf = doc.createBuffer('buf');

	trg1.setAttribute('POSITION', acc1.setArray(new Float32Array([0, 0, 0])).setBuffer(buf));
	trg2.setAttribute('POSITION', acc2.setArray(new Float32Array([0, 0, 0])).setBuffer(buf));
	trg3.setAttribute('POSITION', acc3.setArray(new Float32Array([0, 0, 0])).setBuffer(buf));

	prim
		.addTarget(trg1)
		.addTarget(trg2)
		.addTarget(trg3);

	mesh.addPrimitive(prim);

	const toType = (p: Property): string => p.propertyType;

	t.deepEqual(
		acc1.listParents().map(toType),
		['Root', 'PrimitiveTarget'],
		'links target attributes'
	);
	t.deepEqual(
		acc2.listParents().map(toType),
		['Root', 'PrimitiveTarget'],
		'links target attributes'
	);
	t.deepEqual(
		acc3.listParents().map(toType),
		['Root', 'PrimitiveTarget'],
		'links target attributes'
	);

	t.deepEqual(prim.listTargets(), [trg1, trg2, trg3], 'links targets');
	t.deepEqual(trg1.listParents().map(toType), ['Primitive'], 'links targets');

	const io = new NodeIO();
	const options = {basename: 'targetTest'};
	const jsonDoc = io.writeJSON(io.readJSON(io.writeJSON(doc, options)), options);
	const meshDef = jsonDoc.json.meshes[0];

	t.deepEquals(meshDef.extras.targetNames, ['trg1', 'trg2', 'trg3'], 'writes target names');
	t.deepEquals(
		meshDef.primitives[0].targets,
		[{POSITION: 0}, {POSITION: 1}, {POSITION: 2}],
		'writes target accessors'
	);

	t.end();
});

test('@gltf-transform/core::mesh | copy', t => {
	const doc = new Document();
	const mesh = doc.createMesh('mesh')
		.setWeights([1, 2, 3])
		.addPrimitive(doc.createPrimitive());
	const mesh2 = doc.createMesh().copy(mesh);

	t.deepEqual(mesh2.getWeights(), mesh.getWeights(), 'copy weights');
	t.deepEqual(mesh2.listPrimitives(), mesh.listPrimitives(), 'copy primitives');
	t.end();
});

test('@gltf-transform/core::primitive | copy', t => {
	const doc = new Document();
	const prim = doc.createPrimitive()
		.setAttribute('POSITION', doc.createAccessor())
		.setIndices(doc.createAccessor())
		.setMode(3)
		.setMaterial(doc.createMaterial())
		.addTarget(doc.createPrimitiveTarget())
		.addTarget(doc.createPrimitiveTarget());
	const prim2 = doc.createPrimitive().copy(prim);

	t.equal(prim2.getAttribute('POSITION'), prim2.getAttribute('POSITION'), 'copy attributes');
	t.equal(prim2.getIndices(), prim.getIndices(), 'copy indices');
	t.equal(prim2.getMode(), prim.getMode(), 'copy mode');
	t.equal(prim2.getMaterial(), prim.getMaterial(), 'copy material');
	t.deepEqual(prim2.listTargets(), prim.listTargets(), 'copy targets');
	t.end();
});

test('@gltf-transform/core::mesh | extras', t => {
	const io = new NodeIO();
	const doc = new Document();
	doc.createMesh('A').setExtras({foo: 1, bar: 2})
		.addPrimitive(doc.createPrimitive().setExtras({baz: 3}));

	const writerOptions = {isGLB: false, basename: 'test'};
	const doc2 = io.readJSON(io.writeJSON(doc, writerOptions));

	t.deepEqual(doc.getRoot().listMeshes()[0].getExtras(), {foo: 1, bar: 2}, 'stores mesh extras');
	t.deepEqual(
		doc2.getRoot().listMeshes()[0].getExtras(),
		{foo: 1, bar: 2},
		'roundtrips mesh extras'
	);

	const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
	const prim2 = doc2.getRoot().listMeshes()[0].listPrimitives()[0];
	t.deepEqual(prim.getExtras(), {baz: 3}, 'stores prim extras');
	t.deepEqual(prim2.getExtras(), {baz: 3}, 'roundtrips prim extras');

	t.end();
});

test('@gltf-transform/core::mesh | empty i/o', t => {
	// Technically meshes must have primitives for the file to be valid, but we'll test that
	// reading/writing works anyway.

	const doc = new Document();
	doc.createMesh('EmptyMesh').setWeights([1, 0, 0, 0]);

	const io = new NodeIO();
	let rtDoc = io.readJSON(io.writeJSON(doc, {}));
	let rtMesh = rtDoc.getRoot().listMeshes()[0];

	t.deepEquals(rtMesh.listPrimitives(), [],  'primitives');
	t.deepEquals(rtMesh.getName(), 'EmptyMesh',  'name');
	t.deepEquals(rtMesh.getWeights(), [1, 0, 0, 0], 'weights');

	rtDoc = io.readJSON({
		json: {
			asset: {version: '2.0'},
			meshes: [{
				name: 'EmptyMesh.2',
				weights: [0, 0, 1, 0]
			} as unknown as GLTF.IMesh]
		},
		resources: {}
	});
	rtMesh = rtDoc.getRoot().listMeshes()[0];

	t.deepEquals(rtMesh.listPrimitives(), [],  'primitives');
	t.deepEquals(rtMesh.getName(), 'EmptyMesh.2',  'name');
	t.deepEquals(rtMesh.getWeights(), [0, 0, 1, 0], 'weights');

	t.end();
});

test('@gltf-transform/core::mesh | primitive i/o', t => {
	const doc = new Document();
	const prim = doc.createPrimitive();
	const buffer = doc.createBuffer();

	prim
		.setMode(Primitive.Mode.POINTS)
		.setAttribute('POSITION', doc.createAccessor()
			.setArray(new Float32Array([0, 0, 0]))
			.setType(Accessor.Type.VEC3)
			.setBuffer(buffer))
		.setAttribute('COLOR_0', doc.createAccessor()
			.setArray(new Uint8Array([128, 128, 128]))
			.setType(Accessor.Type.VEC3)
			.setBuffer(buffer))
		.setAttribute('COLOR_1', doc.createAccessor()
			.setArray(new Uint16Array([64, 64, 64]))
			.setType(Accessor.Type.VEC3)
			.setBuffer(buffer))
		.setAttribute('COLOR_2', doc.createAccessor()
			.setArray(new Uint32Array([32, 32, 32]))
			.setType(Accessor.Type.VEC3)
			.setBuffer(buffer))
		.setAttribute('COLOR_3', doc.createAccessor()
			.setArray(new Int16Array([16, 16, 16]))
			.setType(Accessor.Type.VEC3)
			.setBuffer(buffer))
		.setAttribute('COLOR_4', doc.createAccessor()
			.setArray(new Int8Array([8, 8, 8]))
			.setType(Accessor.Type.VEC3)
			.setBuffer(buffer));

	doc.createMesh().addPrimitive(prim);

	const io = new NodeIO();
	const rtDoc = io.readBinary(io.writeBinary(doc));
	const rtPrim = rtDoc.getRoot().listMeshes()[0].listPrimitives()[0];

	t.deepEquals(
		rtPrim.getAttribute('POSITION').getArray(),
		new Float32Array([0, 0, 0]),
		'float32'
	);
	t.deepEquals(
		rtPrim.getAttribute('COLOR_0').getArray(),
		new Uint8Array([128, 128, 128]),
		'uint8'
	);
	t.deepEquals(
		rtPrim.getAttribute('COLOR_1').getArray(),
		new Uint16Array([64, 64, 64]),
		'uint16'
	);
	t.deepEquals(
		rtPrim.getAttribute('COLOR_2').getArray(),
		new Uint32Array([32, 32, 32]),
		'uint32'
	);
	t.deepEquals(
		rtPrim.getAttribute('COLOR_3').getArray(),
		new Int16Array([16, 16, 16]),
		'int8'
	);
	t.deepEquals(
		rtPrim.getAttribute('COLOR_4').getArray(),
		new Int8Array([8, 8, 8]),
		'int8'
	);
	t.end();
});

test('@gltf-transform/core::mesh | primitive vertex layout', t => {
	const doc = new Document();
	const prim = doc.createPrimitive();
	const buffer = doc.createBuffer();

	prim
		.setMode(Primitive.Mode.POINTS)
		.setAttribute('POSITION', doc.createAccessor()
			.setArray(new Float32Array([0, 0, 0]))
			.setType(Accessor.Type.VEC3)
			.setBuffer(buffer))
		.setAttribute('COLOR_0', doc.createAccessor()
			.setArray(new Uint8Array([128, 128, 128]))
			.setType(Accessor.Type.VEC3)
			.setBuffer(buffer))
		.setAttribute('COLOR_1', doc.createAccessor()
			.setArray(new Uint16Array([64, 64, 64]))
			.setType(Accessor.Type.VEC3)
			.setBuffer(buffer))
		.setAttribute('COLOR_2', doc.createAccessor()
			.setArray(new Uint32Array([32, 32, 32]))
			.setType(Accessor.Type.VEC3)
			.setBuffer(buffer));

	doc.createMesh().addPrimitive(prim);

	const io = new NodeIO();

	io.setVertexLayout(VertexLayout.INTERLEAVED);
	const interleavedJSON = io.binaryToJSON(io.writeBinary(doc));
	t.deepEquals(
		interleavedJSON.json.bufferViews,
		[{buffer: 0, target: 34962, byteOffset: 0, byteLength: 36, byteStride: 36}],
		'interleaved buffer byte length'
	);

	io.setVertexLayout(VertexLayout.SEPARATE);
	const separateJSON = io.binaryToJSON(io.writeBinary(doc));
	t.deepEquals(
		separateJSON.json.bufferViews,
		[
			{buffer: 0, target: 34962, byteOffset: 0, byteLength: 12, byteStride: 12},
			{buffer: 0, target: 34962, byteOffset: 12, byteLength: 4, byteStride: 4},
			{buffer: 0, target: 34962, byteOffset: 16, byteLength: 8, byteStride: 8},
			{buffer: 0, target: 34962, byteOffset: 24, byteLength: 12, byteStride: 12},
		],
		'separate buffer byte length'
	);
	t.end();
});
