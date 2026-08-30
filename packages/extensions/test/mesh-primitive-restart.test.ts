import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, type JSONDocument, NodeIO } from '@gltf-transform/core';
import { KHRMeshPrimitiveRestart } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';

const WRITER_OPTIONS = { basename: 'extensionTest' };

describe('extensions::KHRMeshPrimitiveRestart', () => {
	test('basic', async () => {
		const document = new Document();
		const primRestartExtension = document.createExtension(KHRMeshPrimitiveRestart);

		let jsonDoc: JSONDocument;

		jsonDoc = await new NodeIO().registerExtensions([KHRMeshPrimitiveRestart]).writeJSON(document, WRITER_OPTIONS);
		deepEqual(jsonDoc.json.extensionsUsed, [KHRMeshPrimitiveRestart.EXTENSION_NAME], 'writes extensionsUsed');

		primRestartExtension.dispose();

		jsonDoc = await new NodeIO().writeJSON(document, WRITER_OPTIONS);
		strictEqual(jsonDoc.json.extensionsUsed, undefined, 'clears extensionsUsed');
	});

	test('copy', () => {
		const document = new Document();
		document.createExtension(KHRMeshPrimitiveRestart);

		ok(cloneDocument(document).hasExtension('KHR_mesh_primitive_restart'), 'copy KHRMeshPrimitiveRestart');
	});
});
