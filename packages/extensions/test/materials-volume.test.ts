require('source-map-support').install();

import test from 'tape';
import { Document, NodeIO } from '@gltf-transform/core';
import { MaterialsVolume, Volume } from '../';

const WRITER_OPTIONS = {basename: 'extensionTest'};

test('@gltf-transform/extensions::materials-volume', t => {
	const doc = new Document();
	const volumeExtension = doc.createExtension(MaterialsVolume);
	const volume = volumeExtension.createVolume()
		.setThicknessFactor(0.9)
		.setThicknessTexture(doc.createTexture())
		.setAttenuationDistance(2)
		.setAttenuationColor([0.1, 0.2, 0.3]);

	const mat = doc.createMaterial('MyVolumeMaterial')
		.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
		.setExtension('KHR_materials_volume', volume);

	t.equal(mat.getExtension('KHR_materials_volume'), volume, 'volume is attached');

	const jsonDoc = new NodeIO().writeJSON(doc, WRITER_OPTIONS);
	const materialDef = jsonDoc.json.materials[0];

	t.deepEqual(
		materialDef.pbrMetallicRoughness.baseColorFactor,
		[1.0, 0.5, 0.5, 1.0],
		'writes base color'
	);
	t.deepEqual(materialDef.extensions, {'KHR_materials_volume': {
		thicknessFactor: 0.9,
		thicknessTexture: {index: 0, texCoord: 0},
		attenuationDistance: 2,
		attenuationColor: [0.1, 0.2, 0.3]
	}}, 'writes volume extension');
	t.deepEqual(
		jsonDoc.json.extensionsUsed,
		[MaterialsVolume.EXTENSION_NAME],
		'writes extensionsUsed'
	);

	volumeExtension.dispose();
	t.equal(mat.getExtension('KHR_materials_volume'), null, 'volume is detached');

	const roundtripDoc = new NodeIO()
		.registerExtensions([MaterialsVolume])
		.readJSON(jsonDoc);
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
	const roundtripExt = roundtripMat.getExtension<Volume>('KHR_materials_volume');

	t.equal(roundtripExt.getThicknessFactor(), 0.9, 'reads thicknessFactor');
	t.ok(roundtripExt.getThicknessTexture(), 'reads thicknessTexture');
	t.equal(roundtripExt.getAttenuationDistance(), 2, 'reads attenuationDistance');
	t.deepEqual(roundtripExt.getAttenuationColor(), [0.1, 0.2, 0.3], 'reads attenuationColor');

	volume.setAttenuationColorHex(0x4285F4);
	t.equal(volume.getAttenuationColorHex(), 0x4285F4, 'reads/writes hexadecimal sRGB');
	t.end();
});

test('@gltf-transform/extensions::materials-transmission | copy', t => {
	const doc = new Document();
	const volumeExtension = doc.createExtension(MaterialsVolume);
	const volume = volumeExtension.createVolume()
		.setThicknessFactor(0.9)
		.setThicknessTexture(doc.createTexture('trns'))
		.setAttenuationDistance(10)
		.setAttenuationColor([1, 0, 0]);
	doc.createMaterial().setExtension('KHR_materials_volume', volume);

	const doc2 = doc.clone();
	const volume2 = doc2.getRoot().listMaterials()[0]
		.getExtension<Volume>('KHR_materials_volume');
	t.equals(doc2.getRoot().listExtensionsUsed().length, 1, 'copy MaterialsVolume');
	t.ok(volume2, 'copy Volume');
	t.equals(volume2.getThicknessFactor(), 0.9, 'copy thicknessFactor');
	t.equals(volume2.getThicknessTexture().getName(), 'trns', 'copy thicknessTexture');
	t.equals(volume2.getAttenuationDistance(), 10, 'copy attenuationDistance');
	t.deepEquals(volume2.getAttenuationColor(), [1, 0, 0], 'copy attenuationColor');
	t.end();
});
