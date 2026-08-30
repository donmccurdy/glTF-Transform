import { ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document } from '@gltf-transform/core';

describe('core::Document', () => {
	test('transform', async () => {
		const document = new Document();

		await document.transform(
			(c) => c.createTexture(''),
			(c) => c.createBuffer(''),
		);

		strictEqual(document.getRoot().listTextures().length, 1, 'transform 1');
		strictEqual(document.getRoot().listBuffers().length, 1, 'transform 2');
	});

	test('defaults', () => {
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

		ok(true);
	});
});
