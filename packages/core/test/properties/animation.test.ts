require('source-map-support').install();

import test from 'tape';
import { Accessor, Document, NodeIO } from '../../';

test('@gltf-transform/core::animation', t => {
	const doc = new Document();

	const buffer = doc.createBuffer('default');

	const ball = doc.createNode('Ball');

	const input = doc.createAccessor('times')
		.setArray(new Float32Array([0, 1, 2]))
		.setType(Accessor.Type.SCALAR)
		.setBuffer(buffer);

	const output = doc.createAccessor('values')
		.setArray(new Float32Array([
			0, 0, 0,
			0, 1, 0,
			0, 0, 0,
		]))
		.setType(Accessor.Type.VEC3)
		.setBuffer(buffer);

	const sampler = doc.createAnimationSampler()
		.setInput(input)
		.setOutput(output)
		.setInterpolation('LINEAR');

	const channel = doc.createAnimationChannel()
		.setTargetNode(ball)
		.setTargetPath('translation')
		.setSampler(sampler);

	doc.createAnimation('BallBounce')
		.addChannel(channel)
		.addSampler(sampler);

	const io = new NodeIO();

	const options = {basename: 'animationTest'};
	const jsonDoc = io.writeJSON(io.readJSON(io.writeJSON(doc, options)), options);

	t.deepEqual(jsonDoc.json.animations[0], {
		name: 'BallBounce',
		channels: [
			{
				sampler: 0,
				target: {
					node: 0,
					path: 'translation',
				},
			}
		],
		samplers: [
			{
				interpolation: 'LINEAR',
				input: 0,
				output: 1,
			}
		]
	}, 'animation samplers and channels');

	const finalDoc = io.readJSON(jsonDoc);

	t.deepEqual(
		finalDoc.getRoot().listAccessors()[0].getArray(),
		input.getArray(),
		'sampler times'
	);
	t.deepEqual(
		finalDoc.getRoot().listAccessors()[1].getArray(),
		output.getArray(),
		'sampler values'
	);

	t.end();
});

test('@gltf-transform/core::animation | copy', t => {
	const doc = new Document();
	const a = doc.createAnimation('MyAnim')
		.addChannel(doc.createAnimationChannel())
		.addSampler(doc.createAnimationSampler());
	const b = doc.createAnimation().copy(a);

	t.equal(b.getName(), a.getName(), 'copy name');
	t.deepEqual(b.listChannels(), a.listChannels(), 'copy channels');
	t.deepEqual(b.listSamplers(), a.listSamplers(), 'copy samplers');
	t.end();
});

test('@gltf-transform/core::animationChannel | copy', t => {
	const doc = new Document();
	const a = doc.createAnimationChannel('MyChannel')
		.setTargetNode(doc.createNode())
		.setSampler(doc.createAnimationSampler());
	const b = doc.createAnimationChannel().copy(a);

	t.equal(b.getName(), a.getName(), 'copy name');
	t.equal(b.getTargetNode(), a.getTargetNode(), 'copy targetNode');
	t.equal(b.getSampler(), a.getSampler(), 'copy sampler');
	t.end();
});

test('@gltf-transform/core::animationSampler | copy', t => {
	const doc = new Document();
	const a = doc.createAnimationSampler('MySampler')
		.setInterpolation('STEP')
		.setInput(doc.createAccessor())
		.setOutput(doc.createAccessor());
	const b = doc.createAnimationSampler().copy(a);

	t.equal(b.getName(), a.getName(), 'copy name');
	t.equal(b.getInterpolation(), a.getInterpolation(), 'copy interpolation');
	t.equal(b.getInput(), a.getInput(), 'copy input');
	t.equal(b.getOutput(), a.getOutput(), 'copy output');
	t.end();
});

test('@gltf-transform/core::animation | extras', t => {
	const io = new NodeIO();
	const doc = new Document();
	doc.createAnimation('A').setExtras({foo: 1, bar: 2})
		.addChannel(doc.createAnimationChannel().setExtras({channel: true}))
		.addSampler(doc.createAnimationSampler().setExtras({sampler: true}));

	const writerOptions = {isGLB: false, basename: 'test'};
	const doc2 = io.readJSON(io.writeJSON(doc, writerOptions));

	const anim = doc.getRoot().listAnimations()[0];
	const anim2 = doc2.getRoot().listAnimations()[0];

	t.deepEqual(anim.getExtras(), {foo: 1, bar: 2}, 'stores extras');
	t.deepEqual(anim2.getExtras(), {foo: 1, bar: 2}, 'roundtrips extras');
	t.deepEqual(anim.listChannels()[0].getExtras(), {channel: true}, 'stores channel extras');
	t.deepEqual(anim2.listChannels()[0].getExtras(), {channel: true}, 'roundtrips channel extras');
	t.deepEqual(anim.listSamplers()[0].getExtras(), {sampler: true}, 'stores channel extras');
	t.deepEqual(anim2.listSamplers()[0].getExtras(), {sampler: true}, 'roundtrips channel extras');

	t.end();
});
