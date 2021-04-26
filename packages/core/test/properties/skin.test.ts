require('source-map-support').install();

import test from 'tape';
import { Accessor, AnimationChannel, Document, NodeIO } from '../../';

test.only('@gltf-transform/core::skin', t => {
	const doc = new Document();

	const joints = [
		doc.createNode('joint1'),
		doc.createNode('joint2'),
		doc.createNode('joint3'),
	];

	doc.createBuffer('skinBuffer');

	const ibm = doc.createAccessor('ibm')
		.setType(Accessor.Type.MAT4)
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
		]));

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

	const sampler = doc.createAnimationSampler()
		.setInput(doc.createAccessor().setArray(new Uint8Array([0, 1, 2])))
		.setOutput(doc.createAccessor().setArray(new Uint8Array([0, 0, 0, 1, 1, 1, 2, 2, 2])));
	const channel = doc.createAnimationChannel()
		.setSampler(sampler)
		.setTargetNode(joints[0])
		.setTargetPath(AnimationChannel.TargetPath.TRANSLATION);
	doc.createAnimation()
		.addChannel(channel)
		.addSampler(sampler);

	const io = new NodeIO();
	const options = {basename: 'skinTest'};
	const jsonDoc = io.writeJSON(io.readJSON(io.writeJSON(doc, options)), options);

	t.deepEqual(jsonDoc.json.nodes[3], {
		name: 'armature',
		skin: 0,
		children: [0, 1, 2],
	}, 'attaches skin to node');

	t.deepEqual(jsonDoc.json.skins[0], {
		name: 'testSkin',
		inverseBindMatrices: 0,
		joints: [0, 1, 2],
		skeleton: 0,
	}, 'defines skin');

	const ibmAccessor = jsonDoc.json.accessors[jsonDoc.json.skins[0].inverseBindMatrices];
	const inputAccessor = jsonDoc.json.accessors[jsonDoc.json.animations[0].samplers[0].input];
	t.notEqual(
		ibmAccessor.bufferView,
		inputAccessor.bufferView,
		'stores IBMs and animation in different buffer views'
	);

	const actualIBM = new Float32Array(jsonDoc.resources['skinTest.bin'].slice(0, 192));
	t.deepEqual(actualIBM, ibm.getArray(), 'stores skin IBMs');

	t.end();
});

test('@gltf-transform/core::skin | copy', t => {
	const doc = new Document();
	const a = doc.createSkin('MySkin')
		.addJoint(doc.createNode())
		.addJoint(doc.createNode())
		.setSkeleton(doc.createNode())
		.setInverseBindMatrices(doc.createAccessor());
	const b = doc.createSkin().copy(a);

	t.equal(b.getName(), a.getName(), 'copy name');
	t.deepEqual(b.listJoints(), a.listJoints(), 'copy joints');
	t.equal(b.getSkeleton(), a.getSkeleton(), 'copy skeleton');
	t.equal(b.getInverseBindMatrices(), a.getInverseBindMatrices(), 'copy inverseBindMatrices');

	a.copy(doc.createSkin());

	t.equal(a.getSkeleton(), null, 'unset skeleton');
	t.equal(a.getInverseBindMatrices(), null, 'unset inverseBindMatrices');

	t.end();
});

test('@gltf-transform/core::skin | extras', t => {
	const io = new NodeIO();
	const doc = new Document();
	doc.createSkin('A').setExtras({foo: 1, bar: 2});

	const writerOptions = {isGLB: false, basename: 'test'};
	const doc2 = io.readJSON(io.writeJSON(doc, writerOptions));

	t.deepEqual(doc.getRoot().listSkins()[0].getExtras(), {foo: 1, bar: 2}, 'stores extras');
	t.deepEqual(doc2.getRoot().listSkins()[0].getExtras(), {foo: 1, bar: 2}, 'roundtrips extras');

	t.end();
});
