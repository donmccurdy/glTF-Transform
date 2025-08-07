import { Document, NodeIO } from '@gltf-transform/core';
import { KHRMaterialsVolumeScatter, type VolumeScatter } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';
import test from 'ava';

const WRITER_OPTIONS = { basename: 'extensionTest' };

test('basic', async (t) => {
	const doc = new Document();
	doc.createBuffer();
	const scatterExtension = doc.createExtension(KHRMaterialsVolumeScatter);
	const scatter = scatterExtension
		.createVolumeScatter()
		.setMultiscatterColor([0.1, 0.2, 0.3])
		.setScatterAnisotropy(0.3);

	const mat = doc
		.createMaterial('MyVolumeScatterMaterial')
		.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
		.setExtension('KHR_materials_volume_scatter', scatter);

	t.is(mat.getExtension('KHR_materials_volume_scatter'), scatter, 'volume is attached');

	const jsonDoc = await new NodeIO().registerExtensions([KHRMaterialsVolumeScatter]).writeJSON(doc, WRITER_OPTIONS);
	const materialDef = jsonDoc.json.materials[0];

	t.deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
	t.deepEqual(
		materialDef.extensions,
		{
			KHR_materials_volume_scatter: {
				multiscatterColor: [0.1, 0.2, 0.3],
				scatterAnisotropy: 0.3,
			},
		},
		'writes volume scatter extension',
	);
	t.deepEqual(jsonDoc.json.extensionsUsed, [KHRMaterialsVolumeScatter.EXTENSION_NAME], 'writes extensionsUsed');

	scatterExtension.dispose();
	t.is(mat.getExtension('KHR_materials_volume_scatter'), null, 'volume is detached');

	const roundtripDoc = await new NodeIO().registerExtensions([KHRMaterialsVolumeScatter]).readJSON(jsonDoc);
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
	const roundtripExt = roundtripMat.getExtension<VolumeScatter>('KHR_materials_volume_scatter');

	t.is(roundtripExt.getScatterAnisotropy(), 0.3, 'reads scatterAnisotropy');
	t.deepEqual(roundtripExt.getMultiscatterColor(), [0.1, 0.2, 0.3], 'reads multiscatterColor');
});

test('copy', (t) => {
	const doc = new Document();
	const scatterExtension = doc.createExtension(KHRMaterialsVolumeScatter);
	const scatter = scatterExtension.createVolumeScatter().setScatterAnisotropy(0.3).setMultiscatterColor([1, 0, 0]);
	doc.createMaterial().setExtension('KHR_materials_volume_scatter', scatter);

	const doc2 = cloneDocument(doc);
	const scatter2 = doc2.getRoot().listMaterials()[0].getExtension<VolumeScatter>('KHR_materials_volume_scatter');
	t.is(doc2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsVolumeScatter');
	t.truthy(scatter2, 'copy VolumeScatter');
	t.is(scatter2.getScatterAnisotropy(), 0.3, 'copy scatterAnisotropy');
	t.deepEqual(scatter2.getMultiscatterColor(), [1, 0, 0], 'copy multiscatterColor');
});
