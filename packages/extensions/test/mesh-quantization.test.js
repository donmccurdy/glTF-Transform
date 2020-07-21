require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');
const { Document, NodeIO } = require('@gltf-transform/core');
const { MeshQuantization } = require('../');

const WRITER_OPTIONS = {basename: 'extensionTest'};

test('@gltf-transform/extensions::mesh-quantization', t => {
	const doc = new Document();
	const quantizationExtension = doc.createExtension(MeshQuantization);
	let nativeDoc;

	nativeDoc = new NodeIO(fs, path).createNativeDocument(doc, WRITER_OPTIONS);
	t.deepEqual(nativeDoc.json.extensionsUsed, [MeshQuantization.EXTENSION_NAME], 'writes extensionsUsed');

	quantizationExtension.dispose();

	nativeDoc = new NodeIO(fs, path).createNativeDocument(doc, WRITER_OPTIONS);
	t.equal(nativeDoc.json.extensionsUsed, undefined, 'clears extensionsUsed');
	t.end();
});
