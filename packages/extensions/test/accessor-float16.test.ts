import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Accessor, Document, NodeIO } from '@gltf-transform/core';
import { KHRAccessorFloat16 } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';

const WRITER_OPTIONS = { basename: 'extensionTest' };

describe('extensions::KHRAccessorFloat16', () => {
	test('basic', async () => {
		// TODO(v5): Remove after Node.js v22 reaches EOL, or adds Float16Array support.
		if (typeof Float16Array === 'undefined') return;

		const document = new Document();
		const io = new NodeIO().registerExtensions([KHRAccessorFloat16]);

		document.createExtension(KHRAccessorFloat16).setRequired(true);

		const buffer = document.createBuffer();
		const position = document
			.createAccessor()
			.setType('VEC3')
			.setArray(new Float16Array([0, 1, 2]))
			.setBuffer(buffer);
		const prim = document.createPrimitive().setAttribute('POSITION', position);
		document.createMesh().addPrimitive(prim);

		const jsonDoc = await io.writeJSON(document, WRITER_OPTIONS);
		deepEqual(jsonDoc.json.extensionsUsed, [KHRAccessorFloat16.EXTENSION_NAME], 'writes extensionsUsed');
		deepEqual(jsonDoc.json.extensionsRequired, [KHRAccessorFloat16.EXTENSION_NAME], 'writes extensionsRequired');

		const rtDocument = await io.readJSON(jsonDoc);

		const rtExtensions = rtDocument.getRoot().listExtensionsRequired();
		const rtExtension = rtExtensions.find((ext) => ext.extensionName === 'KHR_accessor_float16');
		ok(rtExtension, 'reads KHR_accessor_float16');

		const rtPrim = rtDocument.getRoot().listMeshes()[0].listPrimitives()[0];
		const rtAccessor = rtPrim.getAttribute('POSITION');

		strictEqual(rtAccessor.getComponentType(), Accessor.ComponentType.FLOAT16, 'componentType == FLOAT16');
		ok(rtAccessor.getArray() instanceof Float16Array, 'array instanceof Float16Array');
		deepEqual(Array.from(rtAccessor.getArray()), [0, 1, 2], 'array contents');
	});

	test('copy', () => {
		const document = new Document();
		document.createExtension(KHRAccessorFloat16).setRequired(true);

		strictEqual(cloneDocument(document).getRoot().listExtensionsUsed().length, 1, 'copy KHRAccessorFloat16');
	});
});
