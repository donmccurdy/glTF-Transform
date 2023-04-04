import test from 'ava';
import { Accessor, AnimationChannel, Document } from '@gltf-transform/core';
import { createPlatformIO } from '@gltf-transform/test-utils';

test('basic', async (t) => {
	const document = new Document();

	const joints = [document.createNode('joint1'), document.createNode('joint2'), document.createNode('joint3')];

	document.createBuffer('skinBuffer').setURI('skinTest.bin');

	const ibm = document
		.createAccessor('ibm')
		.setType(Accessor.Type.MAT4)
		.setArray(
			new Float32Array([
				1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,

				2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1,

				3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 1,
			])
		);

	const skin = document
		.createSkin('testSkin')
		.addJoint(joints[0])
		.addJoint(joints[1])
		.addJoint(joints[2])
		.setSkeleton(joints[0])
		.setInverseBindMatrices(ibm);

	document.createNode('armature').addChild(joints[0]).addChild(joints[1]).addChild(joints[2]).setSkin(skin);

	const sampler = document
		.createAnimationSampler()
		.setInput(document.createAccessor().setArray(new Uint8Array([0, 1, 2])))
		.setOutput(document.createAccessor().setArray(new Uint8Array([0, 0, 0, 1, 1, 1, 2, 2, 2])));
	const channel = document
		.createAnimationChannel()
		.setSampler(sampler)
		.setTargetNode(joints[0])
		.setTargetPath(AnimationChannel.TargetPath.TRANSLATION);
	document.createAnimation().addChannel(channel).addSampler(sampler);

	const io = await createPlatformIO();
	const jsonDoc = await io.writeJSON(await io.readJSON(await io.writeJSON(document, {})));

	t.deepEqual(
		jsonDoc.json.nodes[3],
		{
			name: 'armature',
			skin: 0,
			children: [0, 1, 2],
		},
		'attaches skin to node'
	);

	t.deepEqual(
		jsonDoc.json.skins[0],
		{
			name: 'testSkin',
			inverseBindMatrices: 0,
			joints: [0, 1, 2],
			skeleton: 0,
		},
		'defines skin'
	);

	const ibmAccessor = jsonDoc.json.accessors[jsonDoc.json.skins[0].inverseBindMatrices];
	const inputAccessor = jsonDoc.json.accessors[jsonDoc.json.animations[0].samplers[0].input];
	t.not(ibmAccessor.bufferView, inputAccessor.bufferView, 'stores IBMs and animation in different buffer views');

	const actualIBM = new Float32Array(jsonDoc.resources['skinTest.bin'].slice(0, 192).buffer);
	t.deepEqual(Array.from(actualIBM), Array.from(ibm.getArray()), 'stores skin IBMs');
});

test('copy', (t) => {
	const document = new Document();
	const a = document
		.createSkin('MySkin')
		.addJoint(document.createNode())
		.addJoint(document.createNode())
		.setSkeleton(document.createNode())
		.setInverseBindMatrices(document.createAccessor());
	const b = document.createSkin().copy(a);

	t.is(b.getName(), a.getName(), 'copy name');
	t.deepEqual(b.listJoints(), a.listJoints(), 'copy joints');
	t.is(b.getSkeleton(), a.getSkeleton(), 'copy skeleton');
	t.is(b.getInverseBindMatrices(), a.getInverseBindMatrices(), 'copy inverseBindMatrices');

	a.copy(document.createSkin());

	t.is(a.getSkeleton(), null, 'unset skeleton');
	t.is(a.getInverseBindMatrices(), null, 'unset inverseBindMatrices');
});

test('extras', async (t) => {
	const io = await createPlatformIO();
	const document = new Document();
	document.createSkin('A').setExtras({ foo: 1, bar: 2 });

	const doc2 = await io.readJSON(await io.writeJSON(document));

	t.deepEqual(document.getRoot().listSkins()[0].getExtras(), { foo: 1, bar: 2 }, 'stores extras');
	t.deepEqual(doc2.getRoot().listSkins()[0].getExtras(), { foo: 1, bar: 2 }, 'roundtrips extras');
});
