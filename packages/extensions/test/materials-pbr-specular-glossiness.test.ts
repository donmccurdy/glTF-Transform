import test from 'ava';
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRMaterialsPBRSpecularGlossiness, PBRSpecularGlossiness } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';

const WRITER_OPTIONS = { basename: 'extensionTest' };

test('basic', async (t) => {
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

	t.is(mat.getExtension('KHR_materials_pbrSpecularGlossiness'), specGloss, 'specGloss is attached');

	const jsonDoc = await new NodeIO()
		.registerExtensions([KHRMaterialsPBRSpecularGlossiness])
		.writeJSON(doc, WRITER_OPTIONS);
	const materialDef = jsonDoc.json.materials[0];

	t.deepEqual(
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
	t.deepEqual(
		jsonDoc.json.extensionsUsed,
		[KHRMaterialsPBRSpecularGlossiness.EXTENSION_NAME],
		'writes extensionsUsed',
	);

	specGlossExtension.dispose();
	t.is(mat.getExtension('KHR_materials_pbrSpecularGlossiness'), null, 'specGloss is detached');

	const roundtripDoc = await new NodeIO().registerExtensions([KHRMaterialsPBRSpecularGlossiness]).readJSON(jsonDoc);
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
	const roundtripExt = roundtripMat.getExtension<PBRSpecularGlossiness>('KHR_materials_pbrSpecularGlossiness');

	t.deepEqual(roundtripExt.getDiffuseFactor(), [0.5, 0.5, 0.5, 0.9], 'reads diffuseFactor');
	t.deepEqual(roundtripExt.getSpecularFactor(), [0.9, 0.5, 0.8], 'reads specularFactor');
	t.is(roundtripExt.getGlossinessFactor(), 0.5, 'reads glossinessFactor');
	t.truthy(roundtripExt.getSpecularGlossinessTexture(), 'reads specularGlossinessTexture');
});

test('copy', (t) => {
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
	t.is(doc2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsPBRSpecularGlossiness');
	t.truthy(specGloss2, 'copy PBRSpecularGlossiness');
	t.deepEqual(specGloss2.getDiffuseFactor(), [0.5, 0.5, 0.5, 0.9], 'copy diffuseFactor');
	t.deepEqual(specGloss2.getSpecularFactor(), [0.9, 0.5, 0.8], 'copy specularFactor');
	t.is(specGloss2.getGlossinessFactor(), 0.5, 'copy glossinessFactor');
	t.is(specGloss2.getSpecularGlossinessTexture().getName(), 'specGloss', 'copy specularGlossinessTexture');
});
