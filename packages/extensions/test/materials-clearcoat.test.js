require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');
const { Document, NodeIO } = require('@gltf-transform/core');
const { MaterialsClearcoat, Clearcoat } = require('../');

const WRITER_OPTIONS = {basename: 'extensionTest'};

test('@gltf-transform/extensions::materials-clearcroat', t => {
	const doc = new Document();
	const clearcoatExtension = doc.createExtension(MaterialsClearcoat);
	const clearcoat = clearcoatExtension.createClearcoat()
		.setClearcoatFactor(0.9)
		.setClearcoatTexture(doc.createTexture())
		.setClearcoatRoughnessFactor(0.1);

	const mat = doc.createMaterial('MyClearcoatMaterial')
		.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
		.setExtension(Clearcoat, clearcoat);

	t.equal(mat.getExtension(Clearcoat), clearcoat, 'clearcoat is attached');

	const nativeDoc = new NodeIO(fs, path).createNativeDocument(doc, WRITER_OPTIONS);
	const materialDef = nativeDoc.json.materials[0];

	t.deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
	t.deepEqual(materialDef.extensions, {KHR_materials_clearcoat: {
		clearcoatFactor: 0.9,
		clearcoatRoughnessFactor: 0.1,
		clearcoatTexture: {index: 0, texCoord: 0},
	}}, 'writes clearcoat extension');
	t.deepEqual(nativeDoc.json.extensionsUsed, [MaterialsClearcoat.EXTENSION_NAME], 'writes extensionsUsed');

	clearcoatExtension.dispose();
	t.equal(mat.getExtension(Clearcoat), null, 'clearcoat is detached');

	const roundtripDoc = new NodeIO(fs, path)
		.registerExtensions([MaterialsClearcoat])
		.createDocument(nativeDoc);
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();

	t.equal(roundtripMat.getExtension(Clearcoat).getClearcoatFactor(), 0.9, 'reads clearcoatFactor');
	t.equal(roundtripMat.getExtension(Clearcoat).getClearcoatRoughnessFactor(), 0.1, 'reads clearcoatFactor');
	t.ok(roundtripMat.getExtension(Clearcoat).getClearcoatTexture(), 'reads clearcoatTexture');
	t.end();
});
