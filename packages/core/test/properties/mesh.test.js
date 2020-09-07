require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');
const { Document, NodeIO } = require('../../');

test('@gltf-transform/core::mesh', t => {
	const doc = new Document();
	const mesh = doc.createMesh('mesh');
	const prim = doc.createPrimitive('prim');

	mesh.addPrimitive(prim);
	t.deepEqual(mesh.listPrimitives(), [prim], 'adds primitive');

	mesh.removePrimitive(prim);
	t.deepEqual(mesh.listPrimitives(), [], 'removes primitive');

	t.end();
});

test('@gltf-transform/core::mesh | primitive', t => {
	const doc = new Document();
	const prim = doc.createPrimitive('prim');
	const acc1 = doc.createAccessor('acc1');
	const acc2 = doc.createAccessor('acc2');
	const acc3 = doc.createAccessor('acc3');

	const toType = (p) => p.propertyType;

	prim.setAttribute('POSITION', acc1);
	t.equals(prim.getAttribute('POSITION'), acc1, 'sets POSITION');
	t.deepEqual(acc1.listParents().map(toType), ['Root', 'Primitive'], 'links POSITION')

	prim.setAttribute('NORMAL', acc2);
	t.equals(prim.getAttribute('NORMAL'), acc2, 'sets NORMAL');
	t.deepEqual(acc1.listParents().map(toType), ['Root', 'Primitive'], 'links NORMAL')
	t.deepEqual(acc2.listParents().map(toType), ['Root', 'Primitive'], 'links NORMAL')

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
	const prim = doc.createPrimitive('prim');
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

	const toType = (p) => p.propertyType;

	t.deepEqual(acc1.listParents().map(toType), ['Root', 'PrimitiveTarget'], 'links target attributes');
	t.deepEqual(acc2.listParents().map(toType), ['Root', 'PrimitiveTarget'], 'links target attributes');
	t.deepEqual(acc3.listParents().map(toType), ['Root', 'PrimitiveTarget'], 'links target attributes');

	t.deepEqual(prim.listTargets(), [trg1, trg2, trg3], 'links targets');
	t.deepEqual(trg1.listParents().map(toType), ['Primitive'], 'links targets');

	const io = new NodeIO();
	const options = {basename: 'targetTest'};
	const jsonDoc = io.writeJSON(io.readJSON(io.writeJSON(doc, options)), options);
	const meshDef = jsonDoc.json.meshes[0];

	t.deepEquals(meshDef.extras.targetNames, ['trg1', 'trg2', 'trg3'], 'writes target names');
	t.deepEquals(meshDef.primitives[0].targets, [{POSITION: 0}, {POSITION: 1}, {POSITION: 2}], 'writes target accessors');

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
	const io = new NodeIO(fs, path);
	const doc = new Document();
	doc.createMesh('A').setExtras({foo: 1, bar: 2})
		.addPrimitive(doc.createPrimitive().setExtras({baz: 3}));

	const writerOptions = {isGLB: false, basename: 'test'};
	const doc2 = io.readJSON(io.writeJSON(doc, writerOptions));

	t.deepEqual(doc.getRoot().listMeshes()[0].getExtras(), {foo: 1, bar: 2}, 'stores mesh extras');
	t.deepEqual(doc2.getRoot().listMeshes()[0].getExtras(), {foo: 1, bar: 2}, 'roundtrips mesh extras');

	const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
	const prim2 = doc2.getRoot().listMeshes()[0].listPrimitives()[0];
	t.deepEqual(prim.getExtras(), {baz: 3}, 'stores prim extras');
	t.deepEqual(prim2.getExtras(), {baz: 3}, 'roundtrips prim extras');

	t.end();
});
