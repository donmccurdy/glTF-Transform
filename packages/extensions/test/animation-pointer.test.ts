import { Document, NodeIO } from '@gltf-transform/core';
import { type AnimationPointer, KHRAnimationPointer } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';
import test from 'ava';

const WRITER_OPTIONS = { basename: 'extensionTest' };

test('basic', async (t) => {
	const document = new Document();
	document.createNode('Node0');
	const animationPointerExtension = document.createExtension(KHRAnimationPointer);
	const animationPointer = animationPointerExtension.createAnimationPointer().setPointer('/nodes/0/translation');

	const sampler = document.createAnimationSampler();
	const channel = document
		.createAnimationChannel()
		.setSampler(sampler)
		.setTargetPath('pointer')
		.setExtension('KHR_animation_pointer', animationPointer);

	document.createAnimation('MyAnimation').addSampler(sampler).addChannel(channel);

	t.is(channel.getExtension('KHR_animation_pointer'), animationPointer, 'animationPointer is attached');

	const jsonDoc = await new NodeIO().registerExtensions([KHRAnimationPointer]).writeJSON(document, WRITER_OPTIONS);
	const animDef = jsonDoc.json.animations[0];
	const channelDef = animDef.channels[0];

	t.is(channelDef.target.path, 'pointer', 'writes target path as pointer');
	t.is(channelDef.target.node, undefined, 'omits target node');
	t.deepEqual(
		channelDef.target.extensions,
		{ KHR_animation_pointer: { pointer: '/nodes/0/translation' } },
		'writes KHR_animation_pointer target extension',
	);

	animationPointerExtension.dispose();
	t.is(channel.getExtension('KHR_animation_pointer'), null, 'animationPointer is detached');

	const roundtripDoc = await new NodeIO().registerExtensions([KHRAnimationPointer]).readJSON(jsonDoc);
	const roundtripChannel = roundtripDoc.getRoot().listAnimations()[0].listChannels()[0];
	const roundtripAP = roundtripChannel.getExtension<AnimationPointer>('KHR_animation_pointer');

	t.is(roundtripChannel.getTargetPath(), 'pointer', 'reads target path');
	t.is(roundtripAP.getPointer(), 'translation', 'reads relative animation pointer path');
	t.is(roundtripAP.getTargetProperty(), roundtripDoc.getRoot().listNodes()[0], 'resolves target property to node');
});

test('copy', (t) => {
	const document = new Document();
	const node = document.createNode();
	const animationPointerExtension = document.createExtension(KHRAnimationPointer);
	const animationPointer = animationPointerExtension
		.createAnimationPointer()
		.setTargetProperty(node)
		.setPointer('translation');

	const sampler = document.createAnimationSampler();
	const channel = document
		.createAnimationChannel()
		.setSampler(sampler)
		.setTargetPath('pointer')
		.setExtension('KHR_animation_pointer', animationPointer);

	document.createAnimation().addSampler(sampler).addChannel(channel);

	const document2 = cloneDocument(document);
	const channel2 = document2.getRoot().listAnimations()[0].listChannels()[0];
	const animationPointer2 = channel2.getExtension<AnimationPointer>('KHR_animation_pointer');

	t.is(document2.getRoot().listExtensionsUsed().length, 1, 'copy KHRAnimationPointer');
	t.truthy(animationPointer2, 'copy AnimationPointer');
	t.is(animationPointer2.getPointer(), 'translation', 'copy pointer path');
	t.is(animationPointer2.getTargetProperty(), document2.getRoot().listNodes()[0], 'copy targetProperty reference');
});

test('multiple targets', async (t) => {
	const document = new Document();
	const nodeA = document.createNode('NodeA');
	const nodeB = document.createNode('NodeB');
	const animationPointerExtension = document.createExtension(KHRAnimationPointer);

	const animationPointerA = animationPointerExtension
		.createAnimationPointer()
		.setTargetProperty(nodeA)
		.setPointer('scale');

	const animationPointerB = animationPointerExtension
		.createAnimationPointer()
		.setTargetProperty(nodeB)
		.setPointer('translation');

	const samplerA = document.createAnimationSampler();
	const channelA = document
		.createAnimationChannel()
		.setSampler(samplerA)
		.setTargetPath('pointer')
		.setExtension('KHR_animation_pointer', animationPointerA);

	const samplerB = document.createAnimationSampler();
	const channelB = document
		.createAnimationChannel()
		.setSampler(samplerB)
		.setTargetPath('pointer')
		.setExtension('KHR_animation_pointer', animationPointerB);

	document.createAnimation('MyAnimation')
		.addSampler(samplerA)
		.addChannel(channelA)
		.addSampler(samplerB)
		.addChannel(channelB);

	const jsonDoc = await new NodeIO().registerExtensions([KHRAnimationPointer]).writeJSON(document, WRITER_OPTIONS);
	const channelDefA = jsonDoc.json.animations[0].channels[0];
	const channelDefB = jsonDoc.json.animations[0].channels[1];

	t.is(
		(channelDefA.target.extensions[KHRAnimationPointer.EXTENSION_NAME] as { pointer: string }).pointer,
		'/nodes/0/scale',
		'serializes nodeA to index 0',
	);
	t.is(
		(channelDefB.target.extensions[KHRAnimationPointer.EXTENSION_NAME] as { pointer: string }).pointer,
		'/nodes/1/translation',
		'serializes nodeB to index 1',
	);
});

test('deduplication prevention', async (t) => {
	const document = new Document();
	const root = document.getRoot();
	const animationPointerExtension = document.createExtension(KHRAnimationPointer);

	const matA = document.createMaterial('MatA').setBaseColorFactor([0.8, 0.8, 0.8, 1]);
	const matB = matA.clone();

	const animationPointer = animationPointerExtension
		.createAnimationPointer()
		.setTargetProperty(matA)
		.setPointer('pbrMetallicRoughness/baseColorFactor');

	const sampler = document.createAnimationSampler();
	const channel = document
		.createAnimationChannel()
		.setSampler(sampler)
		.setTargetPath('pointer')
		.setExtension('KHR_animation_pointer', animationPointer);

	document.createAnimation().addSampler(sampler).addChannel(channel);

	// Run dedup
	const { dedup } = await import('@gltf-transform/functions');
	await document.transform(dedup());

	t.is(root.listMaterials().length, 2, 'prevents deduplication of animated material');
	t.false(matA.isDisposed(), 'matA is kept');
	t.false(matB.isDisposed(), 'matB is kept (because matA cannot be merged/pruned)');
});

