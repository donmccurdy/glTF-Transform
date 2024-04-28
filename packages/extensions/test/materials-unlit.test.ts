import test from 'ava';
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRMaterialsUnlit } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';

const WRITER_OPTIONS = { basename: 'extensionTest' };

test('basic', async (t) => {
	const doc = new Document();
	const unlitExtension = doc.createExtension(KHRMaterialsUnlit);
	const unlit = unlitExtension.createUnlit();

	const mat = doc
		.createMaterial('MyUnlitMaterial')
		.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
		.setRoughnessFactor(1.0)
		.setMetallicFactor(0.0)
		.setExtension('KHR_materials_unlit', unlit);

	t.is(mat.getExtension('KHR_materials_unlit'), unlit, 'unlit is attached');

	const jsonDoc = await new NodeIO().registerExtensions([KHRMaterialsUnlit]).writeJSON(doc, WRITER_OPTIONS);
	const materialDef = jsonDoc.json.materials[0];

	t.deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
	t.deepEqual(materialDef.extensions, { KHR_materials_unlit: {} }, 'writes unlit extension');
	t.deepEqual(jsonDoc.json.extensionsUsed, [KHRMaterialsUnlit.EXTENSION_NAME], 'writes extensionsUsed');

	const rtDoc = await new NodeIO().registerExtensions([KHRMaterialsUnlit]).readJSON(jsonDoc);
	const rtMat = rtDoc.getRoot().listMaterials()[0];
	t.truthy(rtMat.getExtension('KHR_materials_unlit'), 'unlit is round tripped');

	unlitExtension.dispose();

	t.is(mat.getExtension('KHR_materials_unlit'), null, 'unlit is detached');
});

test('copy', (t) => {
	const doc = new Document();
	const unlitExtension = doc.createExtension(KHRMaterialsUnlit);
	doc.createMaterial().setExtension('KHR_materials_unlit', unlitExtension.createUnlit());

	const doc2 = cloneDocument(doc);
	t.is(doc2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsUnlit');
	t.truthy(doc2.getRoot().listMaterials()[0].getExtension('KHR_materials_unlit'), 'copy Unlit');
});
