import { Accessor, Document, NodeIO } from '@gltf-transform/core';
import { KHRAccessorFloat64 } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';
import test from 'ava';

const WRITER_OPTIONS = { basename: 'extensionTest' };

test('basic', async (t) => {
	const document = new Document();
	const io = new NodeIO().registerExtensions([KHRAccessorFloat64]);

	document.createExtension(KHRAccessorFloat64).setRequired(true);

	const buffer = document.createBuffer();
	const position = document
		.createAccessor()
		.setType('VEC3')
		.setArray(new Float64Array([0, 1, 2]))
		.setBuffer(buffer);
	const prim = document.createPrimitive().setAttribute('POSITION', position);
	document.createMesh().addPrimitive(prim);

	const jsonDoc = await io.writeJSON(document, WRITER_OPTIONS);
	t.deepEqual(jsonDoc.json.extensionsUsed, [KHRAccessorFloat64.EXTENSION_NAME], 'writes extensionsUsed');
	t.deepEqual(jsonDoc.json.extensionsRequired, [KHRAccessorFloat64.EXTENSION_NAME], 'writes extensionsRequired');

	const rtDocument = await io.readJSON(jsonDoc);

	const rtExtensions = rtDocument.getRoot().listExtensionsRequired();
	const rtExtension = rtExtensions.find((ext) => ext.extensionName === 'KHR_accessor_float64');
	t.truthy(rtExtension, 'reads KHR_accessor_float64');

	const rtPrim = rtDocument.getRoot().listMeshes()[0].listPrimitives()[0];
	const rtAccessor = rtPrim.getAttribute('POSITION');

	t.is(rtAccessor.getComponentType(), Accessor.ComponentType.FLOAT64, 'componentType == FLOAT64');
	t.true(rtAccessor.getArray() instanceof Float64Array, 'array instanceof Float64Array');
	t.deepEqual(Array.from(rtAccessor.getArray()), [0, 1, 2], 'array contents');
});

test('copy', (t) => {
	const document = new Document();
	document.createExtension(KHRAccessorFloat64).setRequired(true);

	t.is(cloneDocument(document).getRoot().listExtensionsUsed().length, 1, 'copy KHRAccessorFloat64');
});
