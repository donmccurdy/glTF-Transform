import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document } from '@gltf-transform/core';
import { createPlatformIO } from '@gltf-transform/test-utils';

describe('core::Buffer', () => {
	test('basic', async () => {
		const doc = new Document();
		const buffer1 = doc.createBuffer().setURI('mybuffer.bin');
		const buffer2 = doc.createBuffer().setURI('');
		const buffer3 = doc.createBuffer();
		doc.createBuffer().setURI('empty.bin');

		// Empty buffers aren't written.
		doc.createAccessor()
			.setArray(new Uint8Array([1, 2, 3]))
			.setBuffer(buffer1);
		doc.createAccessor()
			.setArray(new Uint8Array([1, 2, 3]))
			.setBuffer(buffer2);
		doc.createAccessor()
			.setArray(new Uint8Array([1, 2, 3]))
			.setBuffer(buffer3);

		const io = await createPlatformIO();
		const jsonDoc = await io.writeJSON(doc, { basename: 'basename' });

		ok('mybuffer.bin' in jsonDoc.resources, 'explicitly named buffer');
		ok('basename_1.bin' in jsonDoc.resources, 'implicitly named buffer #1');
		ok('basename_2.bin' in jsonDoc.resources, 'implicitly named buffer #2');
		strictEqual('empty.bin' in jsonDoc.resources, false, 'empty buffer skipped');
	});

	test('copy', () => {
		const document = new Document();
		const buffer1 = document.createBuffer('MyBuffer').setURI('mybuffer.bin');
		const buffer2 = document.createBuffer().copy(buffer1);

		strictEqual(buffer1.getName(), buffer2.getName(), 'copy name');
		strictEqual(buffer1.getURI(), buffer2.getURI(), 'copy URI');
	});

	test('extras', async () => {
		const io = await createPlatformIO();
		const document = new Document();
		const buffer = document.createBuffer('A').setExtras({ foo: 1, bar: 2 });
		document
			.createAccessor()
			.setArray(new Uint8Array([1, 2, 3]))
			.setBuffer(buffer);

		const document2 = await io.readJSON(await io.writeJSON(document, { basename: 'test' }));

		deepEqual(document.getRoot().listBuffers()[0].getExtras(), { foo: 1, bar: 2 }, 'stores extras');
		deepEqual(document2.getRoot().listBuffers()[0].getExtras(), { foo: 1, bar: 2 }, 'roundtrips extras');
	});
});
