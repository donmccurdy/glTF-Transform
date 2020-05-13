require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');
const { Document, NodeIO } = require('../');

test('@gltf-transform/core::skin', t => {
	const doc = new Document();

	const joints = [
		doc.createNode('joint1'),
		doc.createNode('joint2'),
		doc.createNode('joint3'),
	];

	const ibm = doc.createAccessor('ibm')
		.setType('MAT4')
		.setArray(new Float32Array([
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1,

			2, 0, 0, 0,
			0, 2, 0, 0,
			0, 0, 2, 0,
			0, 0, 0, 1,

			3, 0, 0, 0,
			0, 3, 0, 0,
			0, 0, 3, 0,
			0, 0, 0, 1,
		]))
		.setBuffer(doc.createBuffer('skinBuffer'));

	// TODO(bug): Omit the buffer above and the accessor silently isn't written.

	const skin = doc.createSkin('testSkin')
		.addJoint(joints[0])
		.addJoint(joints[1])
		.addJoint(joints[2])
		.setSkeleton(joints[0])
		.setInverseBindMatrices(ibm);

	doc.createNode('armature')
		.addChild(joints[0])
		.addChild(joints[1])
		.addChild(joints[2])
		.setSkin(skin);

	const io = new NodeIO(fs, path);
	const options = {basename: 'skinTest'};
	const nativeDoc = io.createNativeDocument(io.createDocument(io.createNativeDocument(doc, options)), options);

	t.deepEqual(nativeDoc.json.nodes[3], {
		name: 'armature',
		skin: 0,
		children: [ 0, 1, 2 ],
		translation: [ 0, 0, 0 ],
		rotation: [ 0, 0, 0, 1 ],
		scale: [ 1, 1, 1 ],
	}, 'attaches skin to node');

	t.deepEqual(nativeDoc.json.skins[0], {
		name: 'testSkin',
		inverseBindMatrices: 0,
		joints: [0, 1, 2],
		skeleton: 0,
	}, 'defines skin');

	t.deepEqual(new Float32Array(nativeDoc.resources['skinTest.bin']), ibm.getArray(), 'stores skin IBMs');

	t.end();
});
