import test from 'ava';
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRMaterialsIridescence, Iridescence } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';

const WRITER_OPTIONS = { basename: 'extensionTest' };

test('basic', async (t) => {
	const doc = new Document();
	doc.createBuffer();
	const iridescenceExtension = doc.createExtension(KHRMaterialsIridescence);
	const iridescence = iridescenceExtension
		.createIridescence()
		.setIridescenceFactor(0.9)
		.setIridescenceIOR(1.5)
		.setIridescenceThicknessMinimum(50)
		.setIridescenceThicknessMaximum(500)
		.setIridescenceTexture(doc.createTexture().setImage(new Uint8Array(1)))
		.setIridescenceThicknessTexture(doc.createTexture().setImage(new Uint8Array(1)));

	const mat = doc
		.createMaterial('MyMaterial')
		.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
		.setExtension('KHR_materials_iridescence', iridescence);

	t.is(mat.getExtension('KHR_materials_iridescence'), iridescence, 'iridescence is attached');

	const jsonDoc = await new NodeIO().registerExtensions([KHRMaterialsIridescence]).writeJSON(doc, WRITER_OPTIONS);
	const materialDef = jsonDoc.json.materials[0];

	t.deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
	t.deepEqual(
		materialDef.extensions,
		{
			KHR_materials_iridescence: {
				iridescenceFactor: 0.9,
				iridescenceIor: 1.5,
				iridescenceThicknessMinimum: 50,
				iridescenceThicknessMaximum: 500,
				iridescenceTexture: { index: 0 },
				iridescenceThicknessTexture: { index: 1 },
			},
		},
		'writes iridescence extension',
	);
	t.deepEqual(jsonDoc.json.extensionsUsed, [KHRMaterialsIridescence.EXTENSION_NAME], 'writes extensionsUsed');

	iridescenceExtension.dispose();
	t.is(mat.getExtension('KHR_materials_iridescence'), null, 'iridescence is detached');

	const roundtripDoc = await new NodeIO().registerExtensions([KHRMaterialsIridescence]).readJSON(jsonDoc);
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
	const roundtripExt = roundtripMat.getExtension<Iridescence>('KHR_materials_iridescence');

	t.is(roundtripExt.getIridescenceFactor(), 0.9, 'reads iridescenceFactor');
	t.is(roundtripExt.getIridescenceIOR(), 1.5, 'reads iridescenceIOR');
	t.is(roundtripExt.getIridescenceThicknessMinimum(), 50, 'reads iridescenceThicknessMinimum');
	t.is(roundtripExt.getIridescenceThicknessMaximum(), 500, 'reads iridescenceThicknessMaximum');
	t.truthy(roundtripExt.getIridescenceTexture(), 'reads iridescenceTexture');
	t.truthy(roundtripExt.getIridescenceThicknessTexture(), 'reads iridescenceThicknessTexture');
});

test('copy', (t) => {
	const doc = new Document();
	const iridescenceExtension = doc.createExtension(KHRMaterialsIridescence);
	const iridescence = iridescenceExtension
		.createIridescence()
		.setIridescenceFactor(0.9)
		.setIridescenceIOR(1.5)
		.setIridescenceThicknessMinimum(50)
		.setIridescenceThicknessMaximum(500)
		.setIridescenceTexture(doc.createTexture('iridescence'))
		.setIridescenceThicknessTexture(doc.createTexture('iridescenceThickness'));
	doc.createMaterial().setExtension('KHR_materials_iridescence', iridescence);

	const doc2 = cloneDocument(doc);
	const iridescence2 = doc2.getRoot().listMaterials()[0].getExtension<Iridescence>('KHR_materials_iridescence');
	t.is(doc2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsIridescence');
	t.truthy(iridescence2, 'copy Iridescence');
	t.is(iridescence2.getIridescenceFactor(), 0.9, 'copy iridescenceFactor');
	t.is(iridescence2.getIridescenceIOR(), 1.5, 'copy iridescenceIOR');
	t.is(iridescence2.getIridescenceThicknessMinimum(), 50, 'copy iridescenceThicknessMinimum');
	t.is(iridescence2.getIridescenceThicknessMaximum(), 500, 'copy iridescenceThicknessMaximum');
	t.is(iridescence2.getIridescenceTexture().getName(), 'iridescence', 'copy iridescenceTexture');
	t.is(
		iridescence2.getIridescenceThicknessTexture().getName(),
		'iridescenceThickness',
		'copy iridescenceThicknessTexture',
	);
});
