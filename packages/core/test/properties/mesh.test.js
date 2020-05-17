require('source-map-support').install();

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
	const nativeDoc = io.createNativeDocument(io.createDocument(io.createNativeDocument(doc, options)), options);
	const meshDef = nativeDoc.json.meshes[0];

	t.deepEquals(meshDef.extras.targetNames, ['trg1', 'trg2', 'trg3'], 'writes target names');
	t.deepEquals(meshDef.primitives[0].targets, [{POSITION: 0}, {POSITION: 1}, {POSITION: 2}], 'writes target accessors');

	t.end();
});
