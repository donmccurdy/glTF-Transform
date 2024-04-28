import test from 'ava';
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRMaterialsDiffuseTransmission, DiffuseTransmission } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';

const WRITER_OPTIONS = { basename: 'extensionTest' };

test('basic', async (t) => {
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

	t.is(mat.getExtension('KHR_materials_diffuse_transmission'), transmission, 'diffuse transmission is attached');

	const jsonDocument = await new NodeIO()
		.registerExtensions([KHRMaterialsDiffuseTransmission])
		.writeJSON(document, WRITER_OPTIONS);
	const materialDef = jsonDocument.json.materials[0];

	t.deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
	t.deepEqual(
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
	t.deepEqual(
		jsonDocument.json.extensionsUsed,
		[KHRMaterialsDiffuseTransmission.EXTENSION_NAME],
		'writes extensionsUsed',
	);

	transmissionExtension.dispose();
	t.is(mat.getExtension('KHR_materials_diffuse_transmission'), null, 'diffuse transmission is detached');

	const roundtripDocument = await new NodeIO()
		.registerExtensions([KHRMaterialsDiffuseTransmission])
		.readJSON(jsonDocument);
	const roundtripMat = roundtripDocument.getRoot().listMaterials().pop();
	const roundtripExt = roundtripMat.getExtension<DiffuseTransmission>('KHR_materials_diffuse_transmission');

	t.is(roundtripExt.getDiffuseTransmissionFactor(), 0.9, 'reads diffuseTransmissionFactor');
	t.truthy(roundtripExt.getDiffuseTransmissionTexture(), 'reads diffuseTransmissionTexture');
});

test('copy', (t) => {
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
	t.is(document2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsDiffuseTransmission');
	t.truthy(diffuseTransmission2, 'copy Transmission');
	t.is(diffuseTransmission2.getDiffuseTransmissionFactor(), 0.9, 'copy transmissionFactor');
	t.is(diffuseTransmission2.getDiffuseTransmissionTexture().getName(), 'trns', 'copy transmissionTexture');
});
