import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, NodeIO } from '@gltf-transform/core';
import { type EmissiveStrength, KHRMaterialsEmissiveStrength } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';
import { createPlatformIO } from '@gltf-transform/test-utils';

const WRITER_OPTIONS = { basename: 'extensionTest' };

describe('extensions::KHRMaterialsEmissiveStrength', () => {
	test('basic', async () => {
		const doc = new Document();
		const emissiveStrengthExtension = doc.createExtension(KHRMaterialsEmissiveStrength);
		const emissiveStrength = emissiveStrengthExtension.createEmissiveStrength().setEmissiveStrength(5.0);

		const mat = doc
			.createMaterial('MyMaterial')
			.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
			.setExtension('KHR_materials_emissive_strength', emissiveStrength);

		strictEqual(
			mat.getExtension('KHR_materials_emissive_strength'),
			emissiveStrength,
			'emissive strength is attached',
		);

		const jsonDoc = await new NodeIO()
			.registerExtensions([KHRMaterialsEmissiveStrength])
			.writeJSON(doc, WRITER_OPTIONS);
		const materialDef = jsonDoc.json.materials[0];

		deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
		deepEqual(
			materialDef.extensions,
			{ KHR_materials_emissive_strength: { emissiveStrength: 5.0 } },
			'writes emissive strength extension',
		);
		deepEqual(jsonDoc.json.extensionsUsed, [KHRMaterialsEmissiveStrength.EXTENSION_NAME], 'writes extensionsUsed');

		emissiveStrengthExtension.dispose();
		strictEqual(mat.getExtension('KHR_materials_emissive_strength'), null, 'emissive strength is detached');

		const roundtripDoc = await new NodeIO().registerExtensions([KHRMaterialsEmissiveStrength]).readJSON(jsonDoc);
		const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();

		strictEqual(
			roundtripMat.getExtension<EmissiveStrength>('KHR_materials_emissive_strength').getEmissiveStrength(),
			5.0,
			'reads emissive strength',
		);
	});

	test('copy', () => {
		const doc = new Document();
		const emissiveStrengthExtension = doc.createExtension(KHRMaterialsEmissiveStrength);
		const emissiveStrength = emissiveStrengthExtension.createEmissiveStrength().setEmissiveStrength(5.0);
		doc.createMaterial().setExtension('KHR_materials_emissive_strength', emissiveStrength);

		const doc2 = cloneDocument(doc);
		const emissiveStrength2 = doc2
			.getRoot()
			.listMaterials()[0]
			.getExtension<EmissiveStrength>('KHR_materials_emissive_strength');
		strictEqual(doc2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsEmissiveStrength');
		ok(emissiveStrength2, 'copy EmissiveStrength');
		strictEqual(emissiveStrength2.getEmissiveStrength(), 5.0, 'copy emissive strength');
	});

	test('extras', async () => {
		const document = new Document();
		const io = await createPlatformIO();
		io.registerExtensions([KHRMaterialsEmissiveStrength]);

		const emissiveStrengthExtension = document.createExtension(KHRMaterialsEmissiveStrength);
		const emissiveStrength = emissiveStrengthExtension.createEmissiveStrength().setExtras({ hello: 'world' });

		document
			.createMaterial('MyMaterial')
			.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
			.setExtension('KHR_materials_emissive_strength', emissiveStrength);

		const rtDocument = await io.readJSON(await io.writeJSON(document));
		const rtMaterial = rtDocument.getRoot().listMaterials().pop();
		const rtExtension = rtMaterial.getExtension<EmissiveStrength>('KHR_materials_emissive_strength');

		deepEqual(rtExtension.getExtras(), { hello: 'world' }, 'reads/writes extras');
	});
});
