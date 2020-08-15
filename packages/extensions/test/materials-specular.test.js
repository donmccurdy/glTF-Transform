require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');
const { Document, NodeIO } = require('@gltf-transform/core');
const { MaterialsSpecular, Specular } = require('../');

const WRITER_OPTIONS = {basename: 'extensionTest'};

test('@gltf-transform/extensions::materials-specular', t => {
	const doc = new Document();
	const specularExtension = doc.createExtension(MaterialsSpecular);
	const specular = specularExtension.createSpecular()
		.setSpecularFactor(0.9)
		.setSpecularColorFactor([0.9, 0.5, .8])
		.setSpecularTexture(doc.createTexture());

	const mat = doc.createMaterial('MyMaterial')
		.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
		.setExtension(Specular, specular);

	t.equal(mat.getExtension(Specular), specular, 'specular is attached');

	const nativeDoc = new NodeIO(fs, path).createNativeDocument(doc, WRITER_OPTIONS);
	const materialDef = nativeDoc.json.materials[0];

	t.deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
	t.deepEqual(materialDef.extensions, {KHR_materials_specular: {
		specularFactor: 0.9,
		specularColorFactor: [0.9, 0.5, 0.8],
		specularTexture: {index: 0, texCoord: 0},
	}}, 'writes specular extension');
	t.deepEqual(nativeDoc.json.extensionsUsed, [MaterialsSpecular.EXTENSION_NAME], 'writes extensionsUsed');

	specularExtension.dispose();
	t.equal(mat.getExtension(Specular), null, 'specular is detached');

	const roundtripDoc = new NodeIO(fs, path)
		.registerExtensions([MaterialsSpecular])
		.createDocument(nativeDoc);
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();

	t.equal(roundtripMat.getExtension(Specular).getSpecularFactor(), 0.9, 'reads specularFactor');
	t.deepEqual(roundtripMat.getExtension(Specular).getSpecularColorFactor(), [0.9, 0.5, 0.8], 'reads specularColorFactor');
	t.ok(roundtripMat.getExtension(Specular).getSpecularTexture(), 'reads specularTexture');
	t.end();
});

test('@gltf-transform/extensions::materials-specular | copy', t => {
	const doc = new Document();
	const specularExtension = doc.createExtension(MaterialsSpecular);
	const specular = specularExtension.createSpecular()
		.setSpecularFactor(0.9)
		.setSpecularColorFactor([0.9, 0.5, 0.8])
		.setSpecularTexture(doc.createTexture('spec'));
	doc.createMaterial()
		.setExtension(Specular, specular);

	const doc2 = doc.clone();
	const specular2 = doc2.getRoot().listMaterials()[0].getExtension(Specular);
	t.equals(doc2.getRoot().listExtensionsUsed().length, 1, 'copy MaterialsSpecular');
	t.ok(specular2, 'copy Specular');
	t.equals(specular2.getSpecularFactor(), 0.9, 'copy specularFactor');
	t.equals(specular2.getSpecularTexture().getName(), 'spec', 'copy specularTexture');
	t.end();
});
