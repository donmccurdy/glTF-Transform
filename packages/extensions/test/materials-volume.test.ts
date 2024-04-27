import test from 'ava';
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRMaterialsVolume, Volume } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';

const WRITER_OPTIONS = { basename: 'extensionTest' };

test('basic', async (t) => {
	const doc = new Document();
	doc.createBuffer();
	const volumeExtension = doc.createExtension(KHRMaterialsVolume);
	const volume = volumeExtension
		.createVolume()
		.setThicknessFactor(0.9)
		.setThicknessTexture(doc.createTexture().setImage(new Uint8Array(1)))
		.setAttenuationDistance(2)
		.setAttenuationColor([0.1, 0.2, 0.3]);

	const mat = doc
		.createMaterial('MyVolumeMaterial')
		.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
		.setExtension('KHR_materials_volume', volume);

	t.is(mat.getExtension('KHR_materials_volume'), volume, 'volume is attached');

	const jsonDoc = await new NodeIO().registerExtensions([KHRMaterialsVolume]).writeJSON(doc, WRITER_OPTIONS);
	const materialDef = jsonDoc.json.materials[0];

	t.deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
	t.deepEqual(
		materialDef.extensions,
		{
			KHR_materials_volume: {
				thicknessFactor: 0.9,
				thicknessTexture: { index: 0 },
				attenuationDistance: 2,
				attenuationColor: [0.1, 0.2, 0.3],
			},
		},
		'writes volume extension',
	);
	t.deepEqual(jsonDoc.json.extensionsUsed, [KHRMaterialsVolume.EXTENSION_NAME], 'writes extensionsUsed');

	volumeExtension.dispose();
	t.is(mat.getExtension('KHR_materials_volume'), null, 'volume is detached');

	const roundtripDoc = await new NodeIO().registerExtensions([KHRMaterialsVolume]).readJSON(jsonDoc);
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
	const roundtripExt = roundtripMat.getExtension<Volume>('KHR_materials_volume');

	t.is(roundtripExt.getThicknessFactor(), 0.9, 'reads thicknessFactor');
	t.truthy(roundtripExt.getThicknessTexture(), 'reads thicknessTexture');
	t.is(roundtripExt.getAttenuationDistance(), 2, 'reads attenuationDistance');
	t.deepEqual(roundtripExt.getAttenuationColor(), [0.1, 0.2, 0.3], 'reads attenuationColor');
});

test('copy', (t) => {
	const doc = new Document();
	const volumeExtension = doc.createExtension(KHRMaterialsVolume);
	const volume = volumeExtension
		.createVolume()
		.setThicknessFactor(0.9)
		.setThicknessTexture(doc.createTexture('trns'))
		.setAttenuationDistance(10)
		.setAttenuationColor([1, 0, 0]);
	doc.createMaterial().setExtension('KHR_materials_volume', volume);

	const doc2 = cloneDocument(doc);
	const volume2 = doc2.getRoot().listMaterials()[0].getExtension<Volume>('KHR_materials_volume');
	t.is(doc2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsVolume');
	t.truthy(volume2, 'copy Volume');
	t.is(volume2.getThicknessFactor(), 0.9, 'copy thicknessFactor');
	t.is(volume2.getThicknessTexture().getName(), 'trns', 'copy thicknessTexture');
	t.is(volume2.getAttenuationDistance(), 10, 'copy attenuationDistance');
	t.deepEqual(volume2.getAttenuationColor(), [1, 0, 0], 'copy attenuationColor');
});
