import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, NodeIO } from '@gltf-transform/core';
import { type DiffuseTransmission, KHRMaterialsDiffuseTransmission } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';
import { createPlatformIO } from '@gltf-transform/test-utils';

const WRITER_OPTIONS = { basename: 'extensionTest' };

describe('extensions::KHRMaterialsDiffuseTransmission', () => {
	test('basic', async () => {
		const document = new Document();
		document.createBuffer();
		const transmissionExtension = document.createExtension(KHRMaterialsDiffuseTransmission);
		const transmission = transmissionExtension
			.createDiffuseTransmission()
			.setDiffuseTransmissionFactor(0.9)
			.setDiffuseTransmissionTexture(document.createTexture().setImage(new Uint8Array(1)));

		const mat = document
			.createMaterial('MyDiffuseTransmissionMaterial')
			.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
			.setExtension('KHR_materials_diffuse_transmission', transmission);

		strictEqual(
			mat.getExtension('KHR_materials_diffuse_transmission'),
			transmission,
			'diffuse transmission is attached',
		);

		const jsonDocument = await new NodeIO()
			.registerExtensions([KHRMaterialsDiffuseTransmission])
			.writeJSON(document, WRITER_OPTIONS);
		const materialDef = jsonDocument.json.materials[0];

		deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
		deepEqual(
			materialDef.extensions,
			{
				KHR_materials_diffuse_transmission: {
					diffuseTransmissionFactor: 0.9,
					diffuseTransmissionColorFactor: [1, 1, 1],
					diffuseTransmissionTexture: { index: 0 },
				},
			},
			'writes transmission extension',
		);
		deepEqual(
			jsonDocument.json.extensionsUsed,
			[KHRMaterialsDiffuseTransmission.EXTENSION_NAME],
			'writes extensionsUsed',
		);

		transmissionExtension.dispose();
		strictEqual(mat.getExtension('KHR_materials_diffuse_transmission'), null, 'diffuse transmission is detached');

		const roundtripDocument = await new NodeIO()
			.registerExtensions([KHRMaterialsDiffuseTransmission])
			.readJSON(jsonDocument);
		const roundtripMat = roundtripDocument.getRoot().listMaterials().pop();
		const roundtripExt = roundtripMat.getExtension<DiffuseTransmission>('KHR_materials_diffuse_transmission');

		strictEqual(roundtripExt.getDiffuseTransmissionFactor(), 0.9, 'reads diffuseTransmissionFactor');
		ok(roundtripExt.getDiffuseTransmissionTexture(), 'reads diffuseTransmissionTexture');
	});

	test('copy', () => {
		const document = new Document();
		const diffuseTransmissionExtension = document.createExtension(KHRMaterialsDiffuseTransmission);
		const diffuseTransmission = diffuseTransmissionExtension
			.createDiffuseTransmission()
			.setDiffuseTransmissionFactor(0.9)
			.setDiffuseTransmissionTexture(document.createTexture('trns'));
		document.createMaterial().setExtension('KHR_materials_diffuse_transmission', diffuseTransmission);

		const document2 = cloneDocument(document);
		const diffuseTransmission2 = document2
			.getRoot()
			.listMaterials()[0]
			.getExtension<DiffuseTransmission>('KHR_materials_diffuse_transmission');
		strictEqual(document2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsDiffuseTransmission');
		ok(diffuseTransmission2, 'copy Transmission');
		strictEqual(diffuseTransmission2.getDiffuseTransmissionFactor(), 0.9, 'copy transmissionFactor');
		strictEqual(diffuseTransmission2.getDiffuseTransmissionTexture().getName(), 'trns', 'copy transmissionTexture');
	});

	test('extras', async () => {
		const document = new Document();
		const io = await createPlatformIO();
		io.registerExtensions([KHRMaterialsDiffuseTransmission]);

		const diffuseTransmissionExtension = document.createExtension(KHRMaterialsDiffuseTransmission);
		const diffuseTransmission = diffuseTransmissionExtension
			.createDiffuseTransmission()
			.setExtras({ hello: 'world' });

		document
			.createMaterial('MyMaterial')
			.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
			.setExtension('KHR_materials_diffuse_transmission', diffuseTransmission);

		const rtDocument = await io.readJSON(await io.writeJSON(document));
		const rtMaterial = rtDocument.getRoot().listMaterials().pop();
		const rtExtension = rtMaterial.getExtension<DiffuseTransmission>('KHR_materials_diffuse_transmission');

		deepEqual(rtExtension.getExtras(), { hello: 'world' }, 'reads/writes extras');
	});
});
