require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');
const { Document, NodeIO } = require('@gltf-transform/core');
const { MaterialsTransmission, Transmission } = require('../');

const WRITER_OPTIONS = {basename: 'extensionTest'};

test('@gltf-transform/extensions::materials-transmission', t => {
	const doc = new Document();
	const transmissionExtension = doc.createExtension(MaterialsTransmission);
	const transmission = transmissionExtension.createTransmission()
		.setTransmissionFactor(0.9)
		.setTransmissionTexture(doc.createTexture());

	const mat = doc.createMaterial('MyTransmissionMaterial')
		.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
		.setExtension('KHR_materials_transmission', transmission);

	t.equal(mat.getExtension('KHR_materials_transmission'), transmission, 'transmission is attached');

	const nativeDoc = new NodeIO(fs, path).createNativeDocument(doc, WRITER_OPTIONS);
	const materialDef = nativeDoc.json.materials[0];

	t.deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
	t.deepEqual(materialDef.extensions, {KHR_materials_transmission: {
		transmissionFactor: 0.9,
		transmissionTexture: {index: 0, texCoord: 0},
	}}, 'writes transmission extension');
	t.deepEqual(nativeDoc.json.extensionsUsed, [MaterialsTransmission.EXTENSION_NAME], 'writes extensionsUsed');

	transmissionExtension.dispose();
	t.equal(mat.getExtension('KHR_materials_transmission'), null, 'transmission is detached');

	const roundtripDoc = new NodeIO(fs, path)
		.registerExtensions([MaterialsTransmission])
		.createDocument(nativeDoc);
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
	const roundtripExt = roundtripMat.getExtension('KHR_materials_transmission');

	t.equal(roundtripExt.getTransmissionFactor(), 0.9, 'reads transmissionFactor');
	t.ok(roundtripExt.getTransmissionTexture(), 'reads transmissionTexture');
	t.end();
});

test('@gltf-transform/extensions::materials-transmission | copy', t => {
	const doc = new Document();
	const transmissionExtension = doc.createExtension(MaterialsTransmission);
	const transmission = transmissionExtension.createTransmission()
		.setTransmissionFactor(0.9)
		.setTransmissionTexture(doc.createTexture('trns'));
	doc.createMaterial()
		.setExtension('KHR_materials_transmission', transmission);

	const doc2 = doc.clone();
	const transmission2 = doc2.getRoot().listMaterials()[0].getExtension('KHR_materials_transmission');
	t.equals(doc2.getRoot().listExtensionsUsed().length, 1, 'copy MaterialsTransmission');
	t.ok(transmission2, 'copy Transmission');
	t.equals(transmission2.getTransmissionFactor(), 0.9, 'copy transmissionFactor');
	t.equals(transmission2.getTransmissionTexture().getName(), 'trns', 'copy transmissionTexture');
	t.end();
});
