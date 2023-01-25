import test from 'ava';
import { Document } from '@gltf-transform/core';
import { createPlatformIO } from '@gltf-transform/test-utils';

test('@gltf-transform/core::buffer', async (t) => {
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

	t.true('mybuffer.bin' in jsonDoc.resources, 'explicitly named buffer');
	t.true('basename_1.bin' in jsonDoc.resources, 'implicitly named buffer #1');
	t.true('basename_2.bin' in jsonDoc.resources, 'implicitly named buffer #2');
	t.false('empty.bin' in jsonDoc.resources, 'empty buffer skipped');
});

test('@gltf-transform/core::buffer | copy', (t) => {
	const doc = new Document();
	const buffer1 = doc.createBuffer('MyBuffer').setURI('mybuffer.bin');
	const buffer2 = doc.createBuffer().copy(buffer1);

	t.is(buffer1.getName(), buffer2.getName(), 'copy name');
	t.is(buffer1.getURI(), buffer2.getURI(), 'copy URI');
});

test('@gltf-transform/core::buffer | extras', async (t) => {
	const io = await createPlatformIO();
	const doc = new Document();
	const buffer = doc.createBuffer('A').setExtras({ foo: 1, bar: 2 });
	doc.createAccessor()
		.setArray(new Uint8Array([1, 2, 3]))
		.setBuffer(buffer);

	const doc2 = await io.readJSON(await io.writeJSON(doc, { basename: 'test' }));

	t.deepEqual(doc.getRoot().listBuffers()[0].getExtras(), { foo: 1, bar: 2 }, 'stores extras');
	t.deepEqual(doc2.getRoot().listBuffers()[0].getExtras(), { foo: 1, bar: 2 }, 'roundtrips extras');
});
