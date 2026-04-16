import { Document, type JSONDocument, NodeIO } from '@gltf-transform/core';
import { KHRMeshPrimitiveRestart } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';
import test from 'ava';

const WRITER_OPTIONS = { basename: 'extensionTest' };

test('basic', async (t) => {
	const document = new Document();
	const primRestartExtension = document.createExtension(KHRMeshPrimitiveRestart);

	let jsonDoc: JSONDocument;

	jsonDoc = await new NodeIO().registerExtensions([KHRMeshPrimitiveRestart]).writeJSON(document, WRITER_OPTIONS);
	t.deepEqual(jsonDoc.json.extensionsUsed, [KHRMeshPrimitiveRestart.EXTENSION_NAME], 'writes extensionsUsed');

	primRestartExtension.dispose();

	jsonDoc = await new NodeIO().writeJSON(document, WRITER_OPTIONS);
	t.is(jsonDoc.json.extensionsUsed, undefined, 'clears extensionsUsed');
});

test('copy', (t) => {
	const doc = new Document();
	doc.createExtension(KHRMeshPrimitiveRestart);

	t.is(cloneDocument(doc).getRoot().listExtensionsUsed().length, 1, 'copy KHRMeshPrimitiveRestart');
});
