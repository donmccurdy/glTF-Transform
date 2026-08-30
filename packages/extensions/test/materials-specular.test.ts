import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRMaterialsSpecular, type Specular } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';
import { createPlatformIO } from '@gltf-transform/test-utils';

const WRITER_OPTIONS = { basename: 'extensionTest' };

describe('extensions::KHRMaterialsSpecular', () => {
	test('basic', async () => {
		const doc = new Document();
		doc.createBuffer();
		const specularExtension = doc.createExtension(KHRMaterialsSpecular);
		const specular = specularExtension
			.createSpecular()
			.setSpecularFactor(0.9)
			.setSpecularColorFactor([0.9, 0.5, 0.8])
			.setSpecularTexture(doc.createTexture().setImage(new Uint8Array(1)))
			.setSpecularColorTexture(doc.createTexture().setImage(new Uint8Array(1)));

		const mat = doc
			.createMaterial('MyMaterial')
			.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
			.setExtension('KHR_materials_specular', specular);

		strictEqual(mat.getExtension('KHR_materials_specular'), specular, 'specular is attached');

		const jsonDoc = await new NodeIO().registerExtensions([KHRMaterialsSpecular]).writeJSON(doc, WRITER_OPTIONS);
		const materialDef = jsonDoc.json.materials[0];

		deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
		deepEqual(
			materialDef.extensions,
			{
				KHR_materials_specular: {
					specularFactor: 0.9,
					specularColorFactor: [0.9, 0.5, 0.8],
					specularTexture: { index: 0 },
					specularColorTexture: { index: 1 },
				},
			},
			'writes specular extension',
		);
		deepEqual(jsonDoc.json.extensionsUsed, [KHRMaterialsSpecular.EXTENSION_NAME], 'writes extensionsUsed');

		specularExtension.dispose();
		strictEqual(mat.getExtension('KHR_materials_specular'), null, 'specular is detached');

		const roundtripDoc = await new NodeIO().registerExtensions([KHRMaterialsSpecular]).readJSON(jsonDoc);
		const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
		const roundtripExt = roundtripMat.getExtension<Specular>('KHR_materials_specular');

		strictEqual(roundtripExt.getSpecularFactor(), 0.9, 'reads specularFactor');
		deepEqual(roundtripExt.getSpecularColorFactor(), [0.9, 0.5, 0.8], 'reads specularColorFactor');
		ok(roundtripExt.getSpecularTexture(), 'reads specularTexture');
	});

	test('copy', () => {
		const doc = new Document();
		const specularExtension = doc.createExtension(KHRMaterialsSpecular);
		const specular = specularExtension
			.createSpecular()
			.setSpecularFactor(0.9)
			.setSpecularColorFactor([0.9, 0.5, 0.8])
			.setSpecularTexture(doc.createTexture('spec'))
			.setSpecularColorTexture(doc.createTexture('specColor'));
		doc.createMaterial().setExtension('KHR_materials_specular', specular);

		const doc2 = cloneDocument(doc);
		const specular2 = doc2.getRoot().listMaterials()[0].getExtension<Specular>('KHR_materials_specular');
		strictEqual(doc2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsSpecular');
		ok(specular2, 'copy Specular');
		strictEqual(specular2.getSpecularFactor(), 0.9, 'copy specularFactor');
		deepEqual(specular2.getSpecularColorFactor(), [0.9, 0.5, 0.8], 'copy specularColorFactor');
		strictEqual(specular2.getSpecularTexture().getName(), 'spec', 'copy specularTexture');
		strictEqual(specular2.getSpecularColorTexture().getName(), 'specColor', 'copy specularColorTexture');
	});

	test('extras', async () => {
		const document = new Document();
		const io = await createPlatformIO();
		io.registerExtensions([KHRMaterialsSpecular]);

		const specularExtension = document.createExtension(KHRMaterialsSpecular);
		const specular = specularExtension.createSpecular().setExtras({ hello: 'world' });

		document
			.createMaterial('MyMaterial')
			.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
			.setExtension('KHR_materials_specular', specular);

		const rtDocument = await io.readJSON(await io.writeJSON(document));
		const rtMaterial = rtDocument.getRoot().listMaterials().pop();
		const rtExtension = rtMaterial.getExtension<Specular>('KHR_materials_specular');

		deepEqual(rtExtension.getExtras(), { hello: 'world' }, 'reads/writes extras');
	});
});
