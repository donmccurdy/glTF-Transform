import { ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document } from '@gltf-transform/core';
import { unpartition } from '@gltf-transform/functions';
import { logger } from '@gltf-transform/test-utils';

describe('functions::unpartition', () => {
	test('basic', async () => {
		const document = new Document();
		const root = document.getRoot();
		const bufferA = document.createBuffer();
		const bufferB = document.createBuffer();
		const bufferC = document.createBuffer();
		const accessorA = document.createAccessor().setBuffer(bufferA);
		const accessorB = document.createAccessor().setBuffer(bufferB);
		const accessorC = document.createAccessor().setBuffer(bufferC);

		document.setLogger(logger);

		await document.transform(unpartition());

		strictEqual(root.listBuffers().length, 1, 'buffers.length === 1');
		strictEqual(bufferA.isDisposed(), false, 'buffersA live');
		ok(bufferB.isDisposed(), 'buffersB disposed');
		ok(bufferC.isDisposed(), 'buffersC disposed');
		strictEqual(accessorA.getBuffer(), bufferA, 'accessorA → bufferA');
		strictEqual(accessorB.getBuffer(), bufferA, 'accessorA → bufferA');
		strictEqual(accessorC.getBuffer(), bufferA, 'accessorA → bufferA');
	});
});
