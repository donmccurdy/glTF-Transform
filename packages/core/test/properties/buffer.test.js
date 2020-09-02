require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');
const { Document, NodeIO } = require('../../');

test('@gltf-transform/core::buffer', t => {
	const doc = new Document();
	const buffer1 = doc.createBuffer().setURI('mybuffer.bin');
	const buffer2 = doc.createBuffer().setURI('');
	const buffer3 = doc.createBuffer();
	doc.createBuffer().setURI('empty.bin');

	// Empty buffers aren't written.
	doc.createAccessor().setArray(new Uint8Array([1, 2, 3])).setBuffer(buffer1);
	doc.createAccessor().setArray(new Uint8Array([1, 2, 3])).setBuffer(buffer2);
	doc.createAccessor().setArray(new Uint8Array([1, 2, 3])).setBuffer(buffer3);

	const io = new NodeIO(fs, path);
	const nativeDoc = io.createNativeDocument(doc, {basename: 'basename', isGLB: false});

	t.true('mybuffer.bin' in nativeDoc.resources, 'explicitly named buffer');
	t.true('basename_1.bin' in nativeDoc.resources, 'implicitly named buffer #1');
	t.true('basename_2.bin' in nativeDoc.resources, 'implicitly named buffer #2');
	t.false('empty.bin' in nativeDoc.resources, 'empty buffer skipped');
	t.end();
});

test('@gltf-transform/core::buffer | copy', t => {
	const doc = new Document();
	const buffer1 = doc.createBuffer('MyBuffer').setURI('mybuffer.bin');
	const buffer2 = doc.createBuffer().copy(buffer1);

	t.equal(buffer1.getName(), buffer2.getName(), 'copy name');
	t.equal(buffer1.getURI(), buffer2.getURI(), 'copy URI');
	t.end();
});

test('@gltf-transform/core::buffer | extras', t => {
	const io = new NodeIO(fs, path);
	const doc = new Document();
	const buffer = doc.createBuffer('A').setExtras({foo: 1, bar: 2});
	doc.createAccessor().setArray(new Uint8Array([1, 2, 3])).setBuffer(buffer);

	const writerOptions = {isGLB: false, basename: 'test'};
	const doc2 = io.createDocument(io.createNativeDocument(doc, writerOptions));

	t.deepEqual(doc.getRoot().listBuffers()[0].getExtras(), {foo: 1, bar: 2}, 'stores extras');
	t.deepEqual(doc2.getRoot().listBuffers()[0].getExtras(), {foo: 1, bar: 2}, 'roundtrips extras');

	t.end();
});
