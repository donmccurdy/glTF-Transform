require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');
const { Document, NodeIO } = require('@gltf-transform/core');
const { MaterialsPBRSpecularGlossiness, PBRSpecularGlossiness } = require('../');

const WRITER_OPTIONS = {basename: 'extensionTest'};

test('@gltf-transform/extensions::materials-pbr-specular-glossiness', t => {
	const doc = new Document();
	const specGlossExtension = doc.createExtension(MaterialsPBRSpecularGlossiness);
	const specGloss = specGlossExtension.createPBRSpecularGlossiness()
		.setDiffuseFactor([0.5, 0.5, 0.5, 0.9])
		.setSpecularFactor([0.9, 0.5, 0.8])
		.setGlossinessFactor(0.5)
		.setSpecularGlossinessTexture(doc.createTexture());

	const mat = doc.createMaterial('MyMaterial')
		.setExtension(PBRSpecularGlossiness, specGloss);

	t.equal(mat.getExtension(PBRSpecularGlossiness), specGloss, 'specGloss is attached');

	const nativeDoc = new NodeIO(fs, path).createNativeDocument(doc, WRITER_OPTIONS);
	const materialDef = nativeDoc.json.materials[0];

	t.deepEqual(materialDef.extensions, {KHR_materials_pbrSpecularGlossiness: {
		diffuseFactor: [0.5, 0.5, 0.5, 0.9],
		specularFactor: [0.9, 0.5, 0.8],
		glossinessFactor: 0.5,
		specularGlossinessTexture: {index: 0, texCoord: 0},
	}}, 'writes specGloss extension');
	t.deepEqual(nativeDoc.json.extensionsUsed, [MaterialsPBRSpecularGlossiness.EXTENSION_NAME], 'writes extensionsUsed');

	specGlossExtension.dispose();
	t.equal(mat.getExtension(PBRSpecularGlossiness), null, 'specGloss is detached');

	const roundtripDoc = new NodeIO(fs, path)
		.registerExtensions([MaterialsPBRSpecularGlossiness])
		.createDocument(nativeDoc);
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();

	t.deepEqual(roundtripMat.getExtension(PBRSpecularGlossiness).getDiffuseFactor(), [0.5, 0.5, 0.5, 0.9], 'reads diffuseFactor');
	t.deepEqual(roundtripMat.getExtension(PBRSpecularGlossiness).getSpecularFactor(), [0.9, 0.5, 0.8], 'reads specularFactor');
	t.equal(roundtripMat.getExtension(PBRSpecularGlossiness).getGlossinessFactor(), 0.5, 'reads glossinessFactor');
	t.ok(roundtripMat.getExtension(PBRSpecularGlossiness).getSpecularGlossinessTexture(), 'reads specularGlossinessTexture');
	t.end();
});

test('@gltf-transform/extensions::materials-pbr-specular-glossiness | copy', t => {
	const doc = new Document();
	const specGlossExtension = doc.createExtension(MaterialsPBRSpecularGlossiness);
	const specGloss = specGlossExtension.createPBRSpecularGlossiness()
		.setDiffuseFactor([0.5, 0.5, 0.5, 0.9])
		.setSpecularFactor([0.9, 0.5, 0.8])
		.setGlossinessFactor(0.5)
		.setSpecularGlossinessTexture(doc.createTexture('specGloss'));
	doc.createMaterial()
		.setExtension(PBRSpecularGlossiness, specGloss);

	const doc2 = doc.clone();
	const specGloss2 = doc2.getRoot().listMaterials()[0].getExtension(PBRSpecularGlossiness);
	t.equals(doc2.getRoot().listExtensionsUsed().length, 1, 'copy MaterialsPBRSpecularGlossiness');
	t.ok(specGloss2, 'copy PBRSpecularGlossiness');
	t.deepEqual(specGloss2.getDiffuseFactor(), [0.5, 0.5, 0.5, 0.9], 'copy diffuseFactor');
	t.deepEqual(specGloss2.getSpecularFactor(), [0.9, 0.5, 0.8], 'copy specularFactor');
	t.equals(specGloss2.getGlossinessFactor(), 0.5, 'copy glossinessFactor');
	t.equals(specGloss2.getSpecularGlossinessTexture().getName(), 'specGloss', 'copy specularGlossinessTexture');
	t.end();
});
