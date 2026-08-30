import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRMaterialsVolume, type Volume } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';
import { createPlatformIO } from '@gltf-transform/test-utils';

const WRITER_OPTIONS = { basename: 'extensionTest' };

describe('extensions::KHRMaterialsVolume', () => {
	test('basic', async () => {
		const doc = new Document();
		doc.createBuffer();
		const volumeExtension = doc.createExtension(KHRMaterialsVolume);
		const volume = volumeExtension
			.createVolume()
			.setThicknessFactor(0.9)
			.setThicknessTexture(doc.createTexture().setImage(new Uint8Array(1)))
			.setAttenuationDistance(2)
			.setAttenuationColor([0.1, 0.2, 0.3]);

		const mat = doc
			.createMaterial('MyVolumeMaterial')
			.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
			.setExtension('KHR_materials_volume', volume);

		strictEqual(mat.getExtension('KHR_materials_volume'), volume, 'volume is attached');

		const jsonDoc = await new NodeIO().registerExtensions([KHRMaterialsVolume]).writeJSON(doc, WRITER_OPTIONS);
		const materialDef = jsonDoc.json.materials[0];

		deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
		deepEqual(
			materialDef.extensions,
			{
				KHR_materials_volume: {
					thicknessFactor: 0.9,
					thicknessTexture: { index: 0 },
					attenuationDistance: 2,
					attenuationColor: [0.1, 0.2, 0.3],
				},
			},
			'writes volume extension',
		);
		deepEqual(jsonDoc.json.extensionsUsed, [KHRMaterialsVolume.EXTENSION_NAME], 'writes extensionsUsed');

		volumeExtension.dispose();
		strictEqual(mat.getExtension('KHR_materials_volume'), null, 'volume is detached');

		const roundtripDoc = await new NodeIO().registerExtensions([KHRMaterialsVolume]).readJSON(jsonDoc);
		const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
		const roundtripExt = roundtripMat.getExtension<Volume>('KHR_materials_volume');

		strictEqual(roundtripExt.getThicknessFactor(), 0.9, 'reads thicknessFactor');
		ok(roundtripExt.getThicknessTexture(), 'reads thicknessTexture');
		strictEqual(roundtripExt.getAttenuationDistance(), 2, 'reads attenuationDistance');
		deepEqual(roundtripExt.getAttenuationColor(), [0.1, 0.2, 0.3], 'reads attenuationColor');
	});

	test('copy', () => {
		const doc = new Document();
		const volumeExtension = doc.createExtension(KHRMaterialsVolume);
		const volume = volumeExtension
			.createVolume()
			.setThicknessFactor(0.9)
			.setThicknessTexture(doc.createTexture('trns'))
			.setAttenuationDistance(10)
			.setAttenuationColor([1, 0, 0]);
		doc.createMaterial().setExtension('KHR_materials_volume', volume);

		const doc2 = cloneDocument(doc);
		const volume2 = doc2.getRoot().listMaterials()[0].getExtension<Volume>('KHR_materials_volume');
		strictEqual(doc2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsVolume');
		ok(volume2, 'copy Volume');
		strictEqual(volume2.getThicknessFactor(), 0.9, 'copy thicknessFactor');
		strictEqual(volume2.getThicknessTexture().getName(), 'trns', 'copy thicknessTexture');
		strictEqual(volume2.getAttenuationDistance(), 10, 'copy attenuationDistance');
		deepEqual(volume2.getAttenuationColor(), [1, 0, 0], 'copy attenuationColor');
	});

	test('extras', async () => {
		const document = new Document();
		const io = await createPlatformIO();
		io.registerExtensions([KHRMaterialsVolume]);

		const volumeExtension = document.createExtension(KHRMaterialsVolume);
		const volume = volumeExtension.createVolume().setExtras({ hello: 'world' });

		document
			.createMaterial('MyMaterial')
			.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
			.setExtension('KHR_materials_volume', volume);

		const rtDocument = await io.readJSON(await io.writeJSON(document));
		const rtMaterial = rtDocument.getRoot().listMaterials().pop();
		const rtExtension = rtMaterial.getExtension<Volume>('KHR_materials_volume');

		deepEqual(rtExtension.getExtras(), { hello: 'world' }, 'reads/writes extras');
	});
});
