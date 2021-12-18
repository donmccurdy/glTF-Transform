require('source-map-support').install();

import test from 'tape';
import { Document, JSONDocument, NodeIO } from '@gltf-transform/core';
import { MeshQuantization } from '../';

const WRITER_OPTIONS = { basename: 'extensionTest' };

test('@gltf-transform/extensions::mesh-quantization', async (t) => {
	const doc = new Document();
	const quantizationExtension = doc.createExtension(MeshQuantization);
	let jsonDoc: JSONDocument;

	jsonDoc = await new NodeIO().registerExtensions([MeshQuantization]).writeJSON(doc, WRITER_OPTIONS);
	t.deepEqual(jsonDoc.json.extensionsUsed, [MeshQuantization.EXTENSION_NAME], 'writes extensionsUsed');

	quantizationExtension.dispose();

	jsonDoc = await new NodeIO().writeJSON(doc, WRITER_OPTIONS);
	t.equal(jsonDoc.json.extensionsUsed, undefined, 'clears extensionsUsed');
	t.end();
});

test('@gltf-transform/extensions::mesh-quantization | copy', (t) => {
	const doc = new Document();
	doc.createExtension(MeshQuantization);

	t.equals(doc.clone().getRoot().listExtensionsUsed().length, 1, 'copy MeshQuantization');
	t.end();
});
