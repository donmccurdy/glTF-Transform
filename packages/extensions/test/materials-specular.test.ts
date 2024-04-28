import test from 'ava';
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRMaterialsSpecular, Specular } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';

const WRITER_OPTIONS = { basename: 'extensionTest' };

test('basic', async (t) => {
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

	t.is(mat.getExtension('KHR_materials_specular'), specular, 'specular is attached');

	const jsonDoc = await new NodeIO().registerExtensions([KHRMaterialsSpecular]).writeJSON(doc, WRITER_OPTIONS);
	const materialDef = jsonDoc.json.materials[0];

	t.deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
	t.deepEqual(
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
	t.deepEqual(jsonDoc.json.extensionsUsed, [KHRMaterialsSpecular.EXTENSION_NAME], 'writes extensionsUsed');

	specularExtension.dispose();
	t.is(mat.getExtension('KHR_materials_specular'), null, 'specular is detached');

	const roundtripDoc = await new NodeIO().registerExtensions([KHRMaterialsSpecular]).readJSON(jsonDoc);
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
	const roundtripExt = roundtripMat.getExtension<Specular>('KHR_materials_specular');

	t.is(roundtripExt.getSpecularFactor(), 0.9, 'reads specularFactor');
	t.deepEqual(roundtripExt.getSpecularColorFactor(), [0.9, 0.5, 0.8], 'reads specularColorFactor');
	t.truthy(roundtripExt.getSpecularTexture(), 'reads specularTexture');
});

test('copy', (t) => {
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
	t.is(doc2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsSpecular');
	t.truthy(specular2, 'copy Specular');
	t.is(specular2.getSpecularFactor(), 0.9, 'copy specularFactor');
	t.deepEqual(specular2.getSpecularColorFactor(), [0.9, 0.5, 0.8], 'copy specularColorFactor');
	t.is(specular2.getSpecularTexture().getName(), 'spec', 'copy specularTexture');
	t.is(specular2.getSpecularColorTexture().getName(), 'specColor', 'copy specularColorTexture');
});
