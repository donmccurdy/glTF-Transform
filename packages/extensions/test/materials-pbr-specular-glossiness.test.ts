import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRMaterialsPBRSpecularGlossiness, type PBRSpecularGlossiness } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';
import { createPlatformIO } from '@gltf-transform/test-utils';

const WRITER_OPTIONS = { basename: 'extensionTest' };

describe('extensions::KHRMaterialsPBRSpecularGlossiness', () => {
	test('basic', async () => {
		const doc = new Document();
		doc.createBuffer();
		const specGlossExtension = doc.createExtension(KHRMaterialsPBRSpecularGlossiness);
		const specGloss = specGlossExtension
			.createPBRSpecularGlossiness()
			.setDiffuseFactor([0.5, 0.5, 0.5, 0.9])
			.setSpecularFactor([0.9, 0.5, 0.8])
			.setGlossinessFactor(0.5)
			.setSpecularGlossinessTexture(doc.createTexture().setImage(new Uint8Array(1)));

		const mat = doc.createMaterial('MyMaterial').setExtension('KHR_materials_pbrSpecularGlossiness', specGloss);

		strictEqual(mat.getExtension('KHR_materials_pbrSpecularGlossiness'), specGloss, 'specGloss is attached');

		const jsonDoc = await new NodeIO()
			.registerExtensions([KHRMaterialsPBRSpecularGlossiness])
			.writeJSON(doc, WRITER_OPTIONS);
		const materialDef = jsonDoc.json.materials[0];

		deepEqual(
			materialDef.extensions,
			{
				KHR_materials_pbrSpecularGlossiness: {
					diffuseFactor: [0.5, 0.5, 0.5, 0.9],
					specularFactor: [0.9, 0.5, 0.8],
					glossinessFactor: 0.5,
					specularGlossinessTexture: { index: 0 },
				},
			},
			'writes specGloss extension',
		);
		deepEqual(
			jsonDoc.json.extensionsUsed,
			[KHRMaterialsPBRSpecularGlossiness.EXTENSION_NAME],
			'writes extensionsUsed',
		);

		specGlossExtension.dispose();
		strictEqual(mat.getExtension('KHR_materials_pbrSpecularGlossiness'), null, 'specGloss is detached');

		const roundtripDoc = await new NodeIO()
			.registerExtensions([KHRMaterialsPBRSpecularGlossiness])
			.readJSON(jsonDoc);
		const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
		const roundtripExt = roundtripMat.getExtension<PBRSpecularGlossiness>('KHR_materials_pbrSpecularGlossiness');

		deepEqual(roundtripExt.getDiffuseFactor(), [0.5, 0.5, 0.5, 0.9], 'reads diffuseFactor');
		deepEqual(roundtripExt.getSpecularFactor(), [0.9, 0.5, 0.8], 'reads specularFactor');
		strictEqual(roundtripExt.getGlossinessFactor(), 0.5, 'reads glossinessFactor');
		ok(roundtripExt.getSpecularGlossinessTexture(), 'reads specularGlossinessTexture');
	});

	test('copy', () => {
		const doc = new Document();
		const specGlossExtension = doc.createExtension(KHRMaterialsPBRSpecularGlossiness);
		const specGloss = specGlossExtension
			.createPBRSpecularGlossiness()
			.setDiffuseFactor([0.5, 0.5, 0.5, 0.9])
			.setSpecularFactor([0.9, 0.5, 0.8])
			.setGlossinessFactor(0.5)
			.setSpecularGlossinessTexture(doc.createTexture('specGloss'));
		doc.createMaterial().setExtension('KHR_materials_pbrSpecularGlossiness', specGloss);

		const doc2 = cloneDocument(doc);
		const specGloss2 = doc2
			.getRoot()
			.listMaterials()[0]
			.getExtension<PBRSpecularGlossiness>('KHR_materials_pbrSpecularGlossiness');
		strictEqual(doc2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsPBRSpecularGlossiness');
		ok(specGloss2, 'copy PBRSpecularGlossiness');
		deepEqual(specGloss2.getDiffuseFactor(), [0.5, 0.5, 0.5, 0.9], 'copy diffuseFactor');
		deepEqual(specGloss2.getSpecularFactor(), [0.9, 0.5, 0.8], 'copy specularFactor');
		strictEqual(specGloss2.getGlossinessFactor(), 0.5, 'copy glossinessFactor');
		strictEqual(specGloss2.getSpecularGlossinessTexture().getName(), 'specGloss', 'copy specularGlossinessTexture');
	});

	test('extras', async () => {
		const document = new Document();
		const io = await createPlatformIO();
		io.registerExtensions([KHRMaterialsPBRSpecularGlossiness]);

		const specGlossExtension = document.createExtension(KHRMaterialsPBRSpecularGlossiness);
		const specGloss = specGlossExtension.createPBRSpecularGlossiness().setExtras({ hello: 'world' });

		document
			.createMaterial('MyMaterial')
			.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
			.setExtension('KHR_materials_pbrSpecularGlossiness', specGloss);

		const rtDocument = await io.readJSON(await io.writeJSON(document));
		const rtMaterial = rtDocument.getRoot().listMaterials().pop();
		const rtExtension = rtMaterial.getExtension<PBRSpecularGlossiness>('KHR_materials_pbrSpecularGlossiness');

		deepEqual(rtExtension.getExtras(), { hello: 'world' }, 'reads/writes extras');
	});
});
