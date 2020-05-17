require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');
const { Document, NodeIO } = require('../../');

test('@gltf-transform/core::animation', t => {
	const doc = new Document();

	const buffer = doc.createBuffer('default');

	const ball = doc.createNode('Ball');

	const input = doc.createAccessor('times')
		.setArray(new Float32Array([0, 1, 2]))
		.setType('SCALAR')
		.setBuffer(buffer);

	const output = doc.createAccessor('values')
		.setArray(new Float32Array([
			0, 0, 0,
			0, 1, 0,
			0, 0, 0,
		]))
		.setType('VEC3')
		.setBuffer(buffer);

	const sampler = doc.createAnimationSampler()
		.setInput(input)
		.setOutput(output)
		.setInterpolation('LINEAR');

	const channel = doc.createAnimationChannel()
		.setTargetNode(ball)
		.setTargetPath('translation')
		.setSampler(sampler)

	doc.createAnimation('BallBounce')
		.addChannel(channel)
		.addSampler(sampler);

	const io = new NodeIO(fs, path);

	const options = {basename: 'animationTest'};
	const nativeDoc = io.createNativeDocument(io.createDocument(io.createNativeDocument(doc, options)), options);

	t.deepEqual(nativeDoc.json.animations[0], {
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

	const finalDoc = io.createDocument(nativeDoc);

	t.deepEqual(finalDoc.getRoot().listAccessors()[0].getArray(), input.getArray(), 'sampler times');
	t.deepEqual(finalDoc.getRoot().listAccessors()[1].getArray(), output.getArray(), 'sampler values');

	t.end();
});
