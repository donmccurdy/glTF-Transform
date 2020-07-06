require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');
const { Document, NodeIO } = require('@gltf-transform/core');
const { MaterialsUnlit, Unlit } = require('../');

const WRITER_OPTIONS = {basename: 'extensionTest'};

test('@gltf-transform/extensions::materials-unlit', t => {
	const doc = new Document();
	const unlitExtension = doc.createExtension(MaterialsUnlit);
	const unlit = unlitExtension.createUnlit();

	const mat = doc.createMaterial('MyUnlitMaterial')
		.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
		.setRoughnessFactor(1.0)
		.setMetallicFactor(0.0)
		.setExtension(Unlit, unlit);

	t.equal(mat.getExtension(Unlit), unlit, 'unlit is attached');

	const nativeDoc = new NodeIO(fs, path).createNativeDocument(doc, WRITER_OPTIONS);
	const materialDef = nativeDoc.json.materials[0];

	t.deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
	t.deepEqual(materialDef.extensions, {KHR_materials_unlit: {}}, 'writes unlit extension');
	t.deepEqual(nativeDoc.json.extensionsUsed, [MaterialsUnlit.EXTENSION_NAME], 'writes extensionsUsed');

	unlitExtension.dispose();

	t.equal(mat.getExtension(Unlit), null, 'unlit is detached');
	t.end();
});
