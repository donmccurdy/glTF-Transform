require('source-map-support').install();

import test from 'tape';
import { Document, NodeIO } from '@gltf-transform/core';
import { MaterialsIridescence, Iridescence } from '../';

const WRITER_OPTIONS = { basename: 'extensionTest' };

test('@gltf-transform/extensions::materials-iridescence', async (t) => {
	const doc = new Document();
	doc.createBuffer();
	const iridescenceExtension = doc.createExtension(MaterialsIridescence);
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

	t.equal(mat.getExtension('KHR_materials_iridescence'), iridescence, 'iridescence is attached');

	const jsonDoc = await new NodeIO().registerExtensions([MaterialsIridescence]).writeJSON(doc, WRITER_OPTIONS);
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
		'writes iridescence extension'
	);
	t.deepEqual(jsonDoc.json.extensionsUsed, [MaterialsIridescence.EXTENSION_NAME], 'writes extensionsUsed');

	iridescenceExtension.dispose();
	t.equal(mat.getExtension('KHR_materials_iridescence'), null, 'iridescence is detached');

	const roundtripDoc = await new NodeIO().registerExtensions([MaterialsIridescence]).readJSON(jsonDoc);
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
	const roundtripExt = roundtripMat.getExtension<Iridescence>('KHR_materials_iridescence');

	t.equal(roundtripExt.getIridescenceFactor(), 0.9, 'reads iridescenceFactor');
	t.equal(roundtripExt.getIridescenceIOR(), 1.5, 'reads iridescenceIOR');
	t.equal(roundtripExt.getIridescenceThicknessMinimum(), 50, 'reads iridescenceThicknessMinimum');
	t.equal(roundtripExt.getIridescenceThicknessMaximum(), 500, 'reads iridescenceThicknessMaximum');
	t.ok(roundtripExt.getIridescenceTexture(), 'reads iridescenceTexture');
	t.ok(roundtripExt.getIridescenceThicknessTexture(), 'reads iridescenceThicknessTexture');
	t.end();
});

test('@gltf-transform/extensions::materials-iridescence | copy', (t) => {
	const doc = new Document();
	const iridescenceExtension = doc.createExtension(MaterialsIridescence);
	const iridescence = iridescenceExtension
		.createIridescence()
		.setIridescenceFactor(0.9)
		.setIridescenceIOR(1.5)
		.setIridescenceThicknessMinimum(50)
		.setIridescenceThicknessMaximum(500)
		.setIridescenceTexture(doc.createTexture('iridescence'))
		.setIridescenceThicknessTexture(doc.createTexture('iridescenceThickness'));
	doc.createMaterial().setExtension('KHR_materials_iridescence', iridescence);

	const doc2 = doc.clone();
	const iridescence2 = doc2.getRoot().listMaterials()[0].getExtension<Iridescence>('KHR_materials_iridescence');
	t.equal(doc2.getRoot().listExtensionsUsed().length, 1, 'copy MaterialsIridescence');
	t.ok(iridescence2, 'copy Iridescence');
	t.equal(iridescence2.getIridescenceFactor(), 0.9, 'copy iridescenceFactor');
	t.equal(iridescence2.getIridescenceIOR(), 1.5, 'copy iridescenceIOR');
	t.equal(iridescence2.getIridescenceThicknessMinimum(), 50, 'copy iridescenceThicknessMinimum');
	t.equal(iridescence2.getIridescenceThicknessMaximum(), 500, 'copy iridescenceThicknessMaximum');
	t.equal(iridescence2.getIridescenceTexture().getName(), 'iridescence', 'copy iridescenceTexture');
	t.equal(
		iridescence2.getIridescenceThicknessTexture().getName(),
		'iridescenceThickness',
		'copy iridescenceThicknessTexture'
	);
	t.end();
});
