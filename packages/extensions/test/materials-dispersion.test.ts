import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, NodeIO } from '@gltf-transform/core';
import { type Dispersion, KHRMaterialsDispersion } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';
import { createPlatformIO } from '@gltf-transform/test-utils';

const WRITER_OPTIONS = { basename: 'extensionTest' };

describe('extensions::KHRMaterialsDispersion', () => {
	test('basic', async () => {
		const doc = new Document();
		const dispersionExtension = doc.createExtension(KHRMaterialsDispersion);
		const dispersion = dispersionExtension.createDispersion().setDispersion(1.2);

		const mat = doc
			.createMaterial('MyMaterial')
			.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
			.setExtension('KHR_materials_dispersion', dispersion);

		strictEqual(mat.getExtension('KHR_materials_dispersion'), dispersion, 'dispersion is attached');

		const jsonDoc = await new NodeIO().registerExtensions([KHRMaterialsDispersion]).writeJSON(doc, WRITER_OPTIONS);
		const materialDef = jsonDoc.json.materials[0];

		deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
		deepEqual(
			materialDef.extensions,
			{ KHR_materials_dispersion: { dispersion: 1.2 } },
			'writes dispersion extension',
		);
		deepEqual(jsonDoc.json.extensionsUsed, [KHRMaterialsDispersion.EXTENSION_NAME], 'writes extensionsUsed');

		dispersionExtension.dispose();
		strictEqual(mat.getExtension('KHR_materials_dispersion'), null, 'dispersion is detached');

		const roundtripDoc = await new NodeIO().registerExtensions([KHRMaterialsDispersion]).readJSON(jsonDoc);
		const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();

		strictEqual(
			roundtripMat.getExtension<Dispersion>('KHR_materials_dispersion').getDispersion(),
			1.2,
			'reads dispersion',
		);
	});

	test('copy', () => {
		const document = new Document();
		const dispersionExtension = document.createExtension(KHRMaterialsDispersion);
		const dispersion = dispersionExtension.createDispersion().setDispersion(1.2);
		document.createMaterial().setExtension('KHR_materials_dispersion', dispersion);

		const document2 = cloneDocument(document);
		const dispersion2 = document2.getRoot().listMaterials()[0].getExtension<Dispersion>('KHR_materials_dispersion');
		strictEqual(document2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsDispersion');
		ok(dispersion2, 'copy dispersion');
		strictEqual(dispersion2.getDispersion(), 1.2, 'copy dispersion');
	});

	test('extras', async () => {
		const document = new Document();
		const io = await createPlatformIO();
		io.registerExtensions([KHRMaterialsDispersion]);

		const dispersionExtension = document.createExtension(KHRMaterialsDispersion);
		const dispersion = dispersionExtension.createDispersion().setExtras({ hello: 'world' });

		document
			.createMaterial('MyMaterial')
			.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
			.setExtension('KHR_materials_dispersion', dispersion);

		const rtDocument = await io.readJSON(await io.writeJSON(document));
		const rtMaterial = rtDocument.getRoot().listMaterials().pop();
		const rtExtension = rtMaterial.getExtension<Dispersion>('KHR_materials_dispersion');

		deepEqual(rtExtension.getExtras(), { hello: 'world' }, 'reads/writes extras');
	});
});
