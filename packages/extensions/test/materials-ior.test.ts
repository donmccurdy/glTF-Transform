import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, NodeIO } from '@gltf-transform/core';
import { type IOR, KHRMaterialsIOR } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';
import { createPlatformIO } from '@gltf-transform/test-utils';

const WRITER_OPTIONS = { basename: 'extensionTest' };

describe('extensions::KHRMaterialsIOR', () => {
	test('basic', async () => {
		const doc = new Document();
		const iorExtension = doc.createExtension(KHRMaterialsIOR);
		const ior = iorExtension.createIOR().setIOR(1.2);

		const mat = doc
			.createMaterial('MyMaterial')
			.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
			.setExtension('KHR_materials_ior', ior);

		strictEqual(mat.getExtension('KHR_materials_ior'), ior, 'ior is attached');

		const jsonDoc = await new NodeIO().registerExtensions([KHRMaterialsIOR]).writeJSON(doc, WRITER_OPTIONS);
		const materialDef = jsonDoc.json.materials[0];

		deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
		deepEqual(materialDef.extensions, { KHR_materials_ior: { ior: 1.2 } }, 'writes ior extension');
		deepEqual(jsonDoc.json.extensionsUsed, [KHRMaterialsIOR.EXTENSION_NAME], 'writes extensionsUsed');

		iorExtension.dispose();
		strictEqual(mat.getExtension('KHR_materials_ior'), null, 'ior is detached');

		const roundtripDoc = await new NodeIO().registerExtensions([KHRMaterialsIOR]).readJSON(jsonDoc);
		const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();

		strictEqual(roundtripMat.getExtension<IOR>('KHR_materials_ior').getIOR(), 1.2, 'reads ior');
	});

	test('copy', () => {
		const doc = new Document();
		const iorExtension = doc.createExtension(KHRMaterialsIOR);
		const ior = iorExtension.createIOR().setIOR(1.2);
		doc.createMaterial().setExtension('KHR_materials_ior', ior);

		const doc2 = cloneDocument(doc);
		const ior2 = doc2.getRoot().listMaterials()[0].getExtension<IOR>('KHR_materials_ior');
		strictEqual(doc2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsIOR');
		ok(ior2, 'copy IOR');
		strictEqual(ior2.getIOR(), 1.2, 'copy ior');
	});

	test('extras', async () => {
		const document = new Document();
		const io = await createPlatformIO();
		io.registerExtensions([KHRMaterialsIOR]);

		const iorExtension = document.createExtension(KHRMaterialsIOR);
		const ior = iorExtension.createIOR().setExtras({ hello: 'world' });

		document
			.createMaterial('MyMaterial')
			.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
			.setExtension('KHR_materials_ior', ior);

		const rtDocument = await io.readJSON(await io.writeJSON(document));
		const rtMaterial = rtDocument.getRoot().listMaterials().pop();
		const rtExtension = rtMaterial.getExtension<IOR>('KHR_materials_ior');

		deepEqual(rtExtension.getExtras(), { hello: 'world' }, 'reads/writes extras');
	});
});
