import test from 'ava';
import { Document } from '@gltf-transform/core';

test('transform', async (t) => {
	const document = new Document();

	await document.transform(
		(c) => c.createTexture(''),
		(c) => c.createBuffer(''),
	);

	t.is(document.getRoot().listTextures().length, 1, 'transform 1');
	t.is(document.getRoot().listBuffers().length, 1, 'transform 2');
});

test('defaults', (t) => {
	// offering to the code coverage gods.
	const document = new Document();

	document.createAccessor('test');
	document.createAnimation('test');
	document.createAnimationChannel('test');
	document.createAnimationSampler('test');
	document.createBuffer('test');
	document.createCamera('test');
	document.createMesh('test');
	document.createNode('test');
	document.createPrimitive();
	document.createPrimitiveTarget('test');
	document.createScene('test');
	document.createSkin('test');

	t.truthy(true);
});
