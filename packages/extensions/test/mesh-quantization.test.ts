import test from 'ava';
import { Document, JSONDocument, NodeIO } from '@gltf-transform/core';
import { KHRMeshQuantization } from '@gltf-transform/extensions';

const WRITER_OPTIONS = { basename: 'extensionTest' };

test('basic', async (t) => {
	const doc = new Document();
	const quantizationExtension = doc.createExtension(KHRMeshQuantization);
	let jsonDoc: JSONDocument;

	jsonDoc = await new NodeIO().registerExtensions([KHRMeshQuantization]).writeJSON(doc, WRITER_OPTIONS);
	t.deepEqual(jsonDoc.json.extensionsUsed, [KHRMeshQuantization.EXTENSION_NAME], 'writes extensionsUsed');

	quantizationExtension.dispose();

	jsonDoc = await new NodeIO().writeJSON(doc, WRITER_OPTIONS);
	t.is(jsonDoc.json.extensionsUsed, undefined, 'clears extensionsUsed');
});

test('copy', (t) => {
	const doc = new Document();
	doc.createExtension(KHRMeshQuantization);

	t.is(doc.clone().getRoot().listExtensionsUsed().length, 1, 'copy KHRMeshQuantization');
});
