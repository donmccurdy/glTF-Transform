import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRMaterialsTransmission, type Transmission } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';
import { createPlatformIO } from '@gltf-transform/test-utils';

const WRITER_OPTIONS = { basename: 'extensionTest' };

describe('extensions::KHRMaterialsTransmission', () => {
	test('basic', async () => {
		const doc = new Document();
		doc.createBuffer();
		const transmissionExtension = doc.createExtension(KHRMaterialsTransmission);
		const transmission = transmissionExtension
			.createTransmission()
			.setTransmissionFactor(0.9)
			.setTransmissionTexture(doc.createTexture().setImage(new Uint8Array(1)));

		const mat = doc
			.createMaterial('MyTransmissionMaterial')
			.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
			.setExtension('KHR_materials_transmission', transmission);

		strictEqual(mat.getExtension('KHR_materials_transmission'), transmission, 'transmission is attached');

		const jsonDoc = await new NodeIO()
			.registerExtensions([KHRMaterialsTransmission])
			.writeJSON(doc, WRITER_OPTIONS);
		const materialDef = jsonDoc.json.materials[0];

		deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
		deepEqual(
			materialDef.extensions,
			{
				KHR_materials_transmission: {
					transmissionFactor: 0.9,
					transmissionTexture: { index: 0 },
				},
			},
			'writes transmission extension',
		);
		deepEqual(jsonDoc.json.extensionsUsed, [KHRMaterialsTransmission.EXTENSION_NAME], 'writes extensionsUsed');

		transmissionExtension.dispose();
		strictEqual(mat.getExtension('KHR_materials_transmission'), null, 'transmission is detached');

		const roundtripDoc = await new NodeIO().registerExtensions([KHRMaterialsTransmission]).readJSON(jsonDoc);
		const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
		const roundtripExt = roundtripMat.getExtension<Transmission>('KHR_materials_transmission');

		strictEqual(roundtripExt.getTransmissionFactor(), 0.9, 'reads transmissionFactor');
		ok(roundtripExt.getTransmissionTexture(), 'reads transmissionTexture');
	});

	test('copy', () => {
		const doc = new Document();
		const transmissionExtension = doc.createExtension(KHRMaterialsTransmission);
		const transmission = transmissionExtension
			.createTransmission()
			.setTransmissionFactor(0.9)
			.setTransmissionTexture(doc.createTexture('trns'));
		doc.createMaterial().setExtension('KHR_materials_transmission', transmission);

		const doc2 = cloneDocument(doc);
		const transmission2 = doc2
			.getRoot()
			.listMaterials()[0]
			.getExtension<Transmission>('KHR_materials_transmission');
		strictEqual(doc2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsTransmission');
		ok(transmission2, 'copy Transmission');
		strictEqual(transmission2.getTransmissionFactor(), 0.9, 'copy transmissionFactor');
		strictEqual(transmission2.getTransmissionTexture().getName(), 'trns', 'copy transmissionTexture');
	});

	test('extras', async () => {
		const document = new Document();
		const io = await createPlatformIO();
		io.registerExtensions([KHRMaterialsTransmission]);

		const transmissionExtension = document.createExtension(KHRMaterialsTransmission);
		const transmission = transmissionExtension.createTransmission().setExtras({ hello: 'world' });

		document
			.createMaterial('MyMaterial')
			.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
			.setExtension('KHR_materials_transmission', transmission);

		const rtDocument = await io.readJSON(await io.writeJSON(document));
		const rtMaterial = rtDocument.getRoot().listMaterials().pop();
		const rtExtension = rtMaterial.getExtension<Transmission>('KHR_materials_transmission');

		deepEqual(rtExtension.getExtras(), { hello: 'world' }, 'reads/writes extras');
	});
});
