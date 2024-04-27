import test from 'ava';
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRMaterialsTransmission, Transmission } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';

const WRITER_OPTIONS = { basename: 'extensionTest' };

test('basic', async (t) => {
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

	t.is(mat.getExtension('KHR_materials_transmission'), transmission, 'transmission is attached');

	const jsonDoc = await new NodeIO().registerExtensions([KHRMaterialsTransmission]).writeJSON(doc, WRITER_OPTIONS);
	const materialDef = jsonDoc.json.materials[0];

	t.deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
	t.deepEqual(
		materialDef.extensions,
		{
			KHR_materials_transmission: {
				transmissionFactor: 0.9,
				transmissionTexture: { index: 0 },
			},
		},
		'writes transmission extension',
	);
	t.deepEqual(jsonDoc.json.extensionsUsed, [KHRMaterialsTransmission.EXTENSION_NAME], 'writes extensionsUsed');

	transmissionExtension.dispose();
	t.is(mat.getExtension('KHR_materials_transmission'), null, 'transmission is detached');

	const roundtripDoc = await new NodeIO().registerExtensions([KHRMaterialsTransmission]).readJSON(jsonDoc);
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
	const roundtripExt = roundtripMat.getExtension<Transmission>('KHR_materials_transmission');

	t.is(roundtripExt.getTransmissionFactor(), 0.9, 'reads transmissionFactor');
	t.truthy(roundtripExt.getTransmissionTexture(), 'reads transmissionTexture');
});

test('copy', (t) => {
	const doc = new Document();
	const transmissionExtension = doc.createExtension(KHRMaterialsTransmission);
	const transmission = transmissionExtension
		.createTransmission()
		.setTransmissionFactor(0.9)
		.setTransmissionTexture(doc.createTexture('trns'));
	doc.createMaterial().setExtension('KHR_materials_transmission', transmission);

	const doc2 = cloneDocument(doc);
	const transmission2 = doc2.getRoot().listMaterials()[0].getExtension<Transmission>('KHR_materials_transmission');
	t.is(doc2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsTransmission');
	t.truthy(transmission2, 'copy Transmission');
	t.is(transmission2.getTransmissionFactor(), 0.9, 'copy transmissionFactor');
	t.is(transmission2.getTransmissionTexture().getName(), 'trns', 'copy transmissionTexture');
});
