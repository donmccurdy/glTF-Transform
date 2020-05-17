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
