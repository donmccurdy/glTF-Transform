import { deepEqual, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Accessor, Document } from '@gltf-transform/core';
import { createPlatformIO } from '@gltf-transform/test-utils';

describe('core::Animation', () => {
	test('basic', async () => {
		const document = new Document();

		const buffer = document.createBuffer('default');

		const ball = document.createNode('Ball');

		const input = document
			.createAccessor('times')
			.setArray(new Float32Array([0, 1, 2]))
			.setType(Accessor.Type.SCALAR)
			.setBuffer(buffer);

		const output = document
			.createAccessor('values')
			.setArray(new Float32Array([0, 0, 0, 0, 1, 0, 0, 0, 0]))
			.setType(Accessor.Type.VEC3)
			.setBuffer(buffer);

		const sampler = document.createAnimationSampler().setInput(input).setOutput(output).setInterpolation('LINEAR');

		const channel = document
			.createAnimationChannel()
			.setTargetNode(ball)
			.setTargetPath('translation')
			.setSampler(sampler);

		document.createAnimation('BallBounce').addChannel(channel).addSampler(sampler);

		const io = await createPlatformIO();

		const options = { basename: 'animationTest' };
		const jsonDoc = await io.writeJSON(await io.readJSON(await io.writeJSON(document, options)), options);

		deepEqual(
			jsonDoc.json.animations[0],
			{
				name: 'BallBounce',
				channels: [
					{
						sampler: 0,
						target: {
							node: 0,
							path: 'translation',
						},
					},
				],
				samplers: [
					{
						interpolation: 'LINEAR',
						input: 0,
						output: 1,
					},
				],
			},
			'animation samplers and channels',
		);

		const finalDoc = await io.readJSON(jsonDoc);

		deepEqual(finalDoc.getRoot().listAccessors()[0].getArray(), input.getArray(), 'sampler times');
		deepEqual(finalDoc.getRoot().listAccessors()[1].getArray(), output.getArray(), 'sampler values');
	});

	test('copy', () => {
		const document = new Document();
		const a = document
			.createAnimation('MyAnim')
			.addChannel(document.createAnimationChannel())
			.addSampler(document.createAnimationSampler());
		const b = document.createAnimation().copy(a);

		strictEqual(b.getName(), a.getName(), 'copy name');
		deepEqual(b.listChannels(), a.listChannels(), 'copy channels');
		deepEqual(b.listSamplers(), a.listSamplers(), 'copy samplers');
	});

	test('copy channel', () => {
		const document = new Document();
		const a = document
			.createAnimationChannel('MyChannel')
			.setTargetNode(document.createNode())
			.setSampler(document.createAnimationSampler());
		const b = document.createAnimationChannel().copy(a);

		strictEqual(b.getName(), a.getName(), 'copy name');
		strictEqual(b.getTargetNode(), a.getTargetNode(), 'copy targetNode');
		strictEqual(b.getSampler(), a.getSampler(), 'copy sampler');
	});

	test('copy sampler', () => {
		const document = new Document();
		const a = document
			.createAnimationSampler('MySampler')
			.setInterpolation('STEP')
			.setInput(document.createAccessor())
			.setOutput(document.createAccessor());
		const b = document.createAnimationSampler().copy(a);

		strictEqual(b.getName(), a.getName(), 'copy name');
		strictEqual(b.getInterpolation(), a.getInterpolation(), 'copy interpolation');
		strictEqual(b.getInput(), a.getInput(), 'copy input');
		strictEqual(b.getOutput(), a.getOutput(), 'copy output');
	});

	test('extras', async () => {
		const io = await createPlatformIO();
		const document = new Document();
		document
			.createAnimation('A')
			.setExtras({ foo: 1, bar: 2 })
			.addChannel(document.createAnimationChannel().setExtras({ channel: true }))
			.addSampler(document.createAnimationSampler().setExtras({ sampler: true }));

		const document2 = await io.readJSON(await io.writeJSON(document, { basename: 'test' }));

		const anim = document.getRoot().listAnimations()[0];
		const anim2 = document2.getRoot().listAnimations()[0];

		deepEqual(anim.getExtras(), { foo: 1, bar: 2 }, 'stores extras');
		deepEqual(anim2.getExtras(), { foo: 1, bar: 2 }, 'roundtrips extras');
		deepEqual(anim.listChannels()[0].getExtras(), { channel: true }, 'stores channel extras');
		deepEqual(anim2.listChannels()[0].getExtras(), { channel: true }, 'roundtrips channel extras');
		deepEqual(anim.listSamplers()[0].getExtras(), { sampler: true }, 'stores channel extras');
		deepEqual(anim2.listSamplers()[0].getExtras(), { sampler: true }, 'roundtrips channel extras');
	});
});
