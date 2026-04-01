import { Document, type JSONDocument, NodeIO } from '@gltf-transform/core';
import { EXTMeshPrimitiveRestart } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';
import test from 'ava';

const WRITER_OPTIONS = { basename: 'extensionTest' };

test('basic', async (t) => {
	const document = new Document();
	const primRestartExtension = document.createExtension(EXTMeshPrimitiveRestart);

	let jsonDoc: JSONDocument;

	jsonDoc = await new NodeIO().registerExtensions([EXTMeshPrimitiveRestart]).writeJSON(document, WRITER_OPTIONS);
	t.deepEqual(jsonDoc.json.extensionsUsed, [EXTMeshPrimitiveRestart.EXTENSION_NAME], 'writes extensionsUsed');

	primRestartExtension.dispose();

	jsonDoc = await new NodeIO().writeJSON(document, WRITER_OPTIONS);
	t.is(jsonDoc.json.extensionsUsed, undefined, 'clears extensionsUsed');
});

test('copy', (t) => {
	const doc = new Document();
	doc.createExtension(EXTMeshPrimitiveRestart);

	t.is(cloneDocument(doc).getRoot().listExtensionsUsed().length, 1, 'copy EXTMeshPrimitiveRestart');
});
