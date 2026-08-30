import { deepEqual, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, type JSONDocument, NodeIO } from '@gltf-transform/core';
import { KHRMeshQuantization } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';

const WRITER_OPTIONS = { basename: 'extensionTest' };

describe('extensions::KHRMeshQuantization', () => {
	test('basic', async () => {
		const doc = new Document();
		const quantizationExtension = doc.createExtension(KHRMeshQuantization);
		let jsonDoc: JSONDocument;

		jsonDoc = await new NodeIO().registerExtensions([KHRMeshQuantization]).writeJSON(doc, WRITER_OPTIONS);
		deepEqual(jsonDoc.json.extensionsUsed, [KHRMeshQuantization.EXTENSION_NAME], 'writes extensionsUsed');

		quantizationExtension.dispose();

		jsonDoc = await new NodeIO().writeJSON(doc, WRITER_OPTIONS);
		strictEqual(jsonDoc.json.extensionsUsed, undefined, 'clears extensionsUsed');
	});

	test('copy', () => {
		const doc = new Document();
		doc.createExtension(KHRMeshQuantization);

		strictEqual(cloneDocument(doc).getRoot().listExtensionsUsed().length, 1, 'copy KHRMeshQuantization');
	});
});
