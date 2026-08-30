import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document } from '@gltf-transform/core';
import { type Anisotropy, KHRMaterialsAnisotropy } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';
import { createPlatformIO } from '@gltf-transform/test-utils';

const WRITER_OPTIONS = { basename: 'extensionTest' };

describe('extensions::KHRMaterialsAnisotropy', () => {
	test('factors', async () => {
		const document = new Document();
		const io = await createPlatformIO();
		io.registerExtensions([KHRMaterialsAnisotropy]);

		const anisotropyExtension = document.createExtension(KHRMaterialsAnisotropy);
		const anisotropy = anisotropyExtension
			.createAnisotropy()
			.setAnisotropyStrength(0.9)
			.setAnisotropyRotation(Math.PI / 3);

		document
			.createMaterial('MyAnisotropyMaterial')
			.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
			.setExtension('KHR_materials_anisotropy', anisotropy);

		const roundtripDoc = await io.readJSON(await io.writeJSON(document));
		const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
		const roundtripExt = roundtripMat.getExtension<Anisotropy>('KHR_materials_anisotropy');

		strictEqual(roundtripExt.getAnisotropyStrength(), 0.9, 'reads anisotropyStrength');
		strictEqual(roundtripExt.getAnisotropyRotation(), Math.PI / 3, 'reads anisotropyRotation');
	});

	test('textures', async () => {
		const document = new Document();
		const io = await createPlatformIO();
		io.registerExtensions([KHRMaterialsAnisotropy]);

		document.createBuffer();
		const anisotropyExtension = document.createExtension(KHRMaterialsAnisotropy);
		const anisotropy = anisotropyExtension
			.createAnisotropy()
			.setAnisotropyStrength(0.9)
			.setAnisotropyRotation(Math.PI / 3)
			.setAnisotropyTexture(document.createTexture().setImage(new Uint8Array(1)));

		const material = document
			.createMaterial('MyAnisotropyMaterial')
			.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
			.setExtension('KHR_materials_anisotropy', anisotropy);

		strictEqual(material.getExtension('KHR_materials_anisotropy'), anisotropy, 'anisotropy is attached');

		const jsonDoc = await io.writeJSON(document, WRITER_OPTIONS);
		const materialDef = jsonDoc.json.materials[0];

		deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
		deepEqual(
			materialDef.extensions,
			{
				KHR_materials_anisotropy: {
					anisotropyStrength: 0.9,
					anisotropyRotation: Math.PI / 3,
					anisotropyTexture: { index: 0 },
				},
			},
			'writes anisotropy extension',
		);
		deepEqual(jsonDoc.json.extensionsUsed, [KHRMaterialsAnisotropy.EXTENSION_NAME], 'writes extensionsUsed');

		anisotropyExtension.dispose();
		strictEqual(material.getExtension('KHR_materials_anisotropy'), null, 'anisotropy is detached');

		const roundtripDoc = await io.readJSON(jsonDoc);
		const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
		const roundtripExt = roundtripMat.getExtension<Anisotropy>('KHR_materials_anisotropy');

		strictEqual(roundtripExt.getAnisotropyStrength(), 0.9, 'reads anisotropyStrength');
		strictEqual(roundtripExt.getAnisotropyRotation(), Math.PI / 3, 'reads anisotropyRotation');
		ok(roundtripExt.getAnisotropyTexture(), 'reads anisotropyTexture');
	});

	test('disabled', async () => {
		const document = new Document();
		const io = await createPlatformIO();
		io.registerExtensions([KHRMaterialsAnisotropy]);

		document.createExtension(KHRMaterialsAnisotropy);
		document.createMaterial();

		const roundtripDoc = await io.readJSON(await io.writeJSON(document));
		const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
		strictEqual(roundtripMat.getExtension('KHR_materials_anisotropy'), null, 'no effect when not attached');
	});

	test('copy', () => {
		const document = new Document();
		const anisotropyExtension = document.createExtension(KHRMaterialsAnisotropy);
		const anisotropy = anisotropyExtension
			.createAnisotropy()
			.setAnisotropyStrength(0.9)
			.setAnisotropyRotation(Math.PI / 3)
			.setAnisotropyTexture(document.createTexture('ABC'));
		document.createMaterial().setExtension('KHR_materials_anisotropy', anisotropy);

		const document2 = cloneDocument(document);
		const anisotropy2 = document2.getRoot().listMaterials()[0].getExtension<Anisotropy>('KHR_materials_anisotropy');
		strictEqual(document2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsAnisotropy');
		ok(anisotropy2, 'copy Anisotropy');
		strictEqual(anisotropy2.getAnisotropyStrength(), 0.9, 'copy anisotropyStrength');
		strictEqual(anisotropy2.getAnisotropyRotation(), Math.PI / 3, 'copy anisotropyRotation');
		strictEqual(anisotropy2.getAnisotropyTexture().getName(), 'ABC', 'copy anisotropyTexture');
	});

	test('extras', async () => {
		const document = new Document();
		const io = await createPlatformIO();
		io.registerExtensions([KHRMaterialsAnisotropy]);

		const anisotropyExtension = document.createExtension(KHRMaterialsAnisotropy);
		const anisotropy = anisotropyExtension.createAnisotropy().setExtras({ hello: 'world' });

		document
			.createMaterial('MyMaterial')
			.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
			.setExtension('KHR_materials_anisotropy', anisotropy);

		const rtDocument = await io.readJSON(await io.writeJSON(document));
		const rtMaterial = rtDocument.getRoot().listMaterials().pop();
		const rtExtension = rtMaterial.getExtension<Anisotropy>('KHR_materials_anisotropy');

		deepEqual(rtExtension.getExtras(), { hello: 'world' }, 'reads/writes extras');
	});
});
