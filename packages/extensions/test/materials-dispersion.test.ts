import test from 'ava';
import { Document, NodeIO } from '@gltf-transform/core';
import { Dispersion, KHRMaterialsDispersion } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';

const WRITER_OPTIONS = { basename: 'extensionTest' };

test('basic', async (t) => {
	const doc = new Document();
	const dispersionExtension = doc.createExtension(KHRMaterialsDispersion);
	const dispersion = dispersionExtension.createDispersion().setDispersion(1.2);

	const mat = doc
		.createMaterial('MyMaterial')
		.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
		.setExtension('KHR_materials_dispersion', dispersion);

	t.is(mat.getExtension('KHR_materials_dispersion'), dispersion, 'dispersion is attached');

	const jsonDoc = await new NodeIO().registerExtensions([KHRMaterialsDispersion]).writeJSON(doc, WRITER_OPTIONS);
	const materialDef = jsonDoc.json.materials[0];

	t.deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
	t.deepEqual(
		materialDef.extensions,
		{ KHR_materials_dispersion: { dispersion: 1.2 } },
		'writes dispersion extension',
	);
	t.deepEqual(jsonDoc.json.extensionsUsed, [KHRMaterialsDispersion.EXTENSION_NAME], 'writes extensionsUsed');

	dispersionExtension.dispose();
	t.is(mat.getExtension('KHR_materials_dispersion'), null, 'dispersion is detached');

	const roundtripDoc = await new NodeIO().registerExtensions([KHRMaterialsDispersion]).readJSON(jsonDoc);
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();

	t.is(roundtripMat.getExtension<Dispersion>('KHR_materials_dispersion').getDispersion(), 1.2, 'reads dispersion');
});

test('copy', (t) => {
	const document = new Document();
	const dispersionExtension = document.createExtension(KHRMaterialsDispersion);
	const dispersion = dispersionExtension.createDispersion().setDispersion(1.2);
	document.createMaterial().setExtension('KHR_materials_dispersion', dispersion);

	const document2 = cloneDocument(document);
	const dispersion2 = document2.getRoot().listMaterials()[0].getExtension<Dispersion>('KHR_materials_dispersion');
	t.is(document2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsDispersion');
	t.truthy(dispersion2, 'copy dispersion');
	t.is(dispersion2.getDispersion(), 1.2, 'copy dispersion');
});
