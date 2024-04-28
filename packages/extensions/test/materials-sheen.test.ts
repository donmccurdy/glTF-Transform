import test from 'ava';
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRMaterialsSheen, Sheen } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';

const WRITER_OPTIONS = { basename: 'extensionTest' };

test('basic', async (t) => {
	const doc = new Document();
	doc.createBuffer();
	const sheenExtension = doc.createExtension(KHRMaterialsSheen);
	const sheen = sheenExtension
		.createSheen()
		.setSheenColorFactor([0.9, 0.5, 0.8])
		.setSheenColorTexture(doc.createTexture().setImage(new Uint8Array(1)));

	const mat = doc
		.createMaterial('MyMaterial')
		.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
		.setExtension('KHR_materials_sheen', sheen);

	t.is(mat.getExtension('KHR_materials_sheen'), sheen, 'sheen is attached');

	const jsonDoc = await new NodeIO().registerExtensions([KHRMaterialsSheen]).writeJSON(doc, WRITER_OPTIONS);
	const materialDef = jsonDoc.json.materials[0];

	t.deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
	t.deepEqual(
		materialDef.extensions,
		{
			KHR_materials_sheen: {
				sheenColorFactor: [0.9, 0.5, 0.8],
				sheenRoughnessFactor: 0,
				sheenColorTexture: { index: 0 },
			},
		},
		'writes sheen extension',
	);
	t.deepEqual(jsonDoc.json.extensionsUsed, [KHRMaterialsSheen.EXTENSION_NAME], 'writes extensionsUsed');

	sheenExtension.dispose();
	t.is(mat.getExtension('KHR_materials_sheen'), null, 'sheen is detached');

	const roundtripDoc = await new NodeIO().registerExtensions([KHRMaterialsSheen]).readJSON(jsonDoc);
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
	const roundtripExt = roundtripMat.getExtension<Sheen>('KHR_materials_sheen');

	t.deepEqual(roundtripExt.getSheenColorFactor(), [0.9, 0.5, 0.8], 'reads sheenColorFactor');
	t.truthy(roundtripExt.getSheenColorTexture(), 'reads sheenColorTexture');
});

test('copy', (t) => {
	const doc = new Document();
	const sheenExtension = doc.createExtension(KHRMaterialsSheen);
	const sheen = sheenExtension
		.createSheen()
		.setSheenColorFactor([0.9, 0.5, 0.8])
		.setSheenColorTexture(doc.createTexture('sheen'));
	doc.createMaterial().setExtension('KHR_materials_sheen', sheen);

	const doc2 = cloneDocument(doc);
	const sheen2 = doc2.getRoot().listMaterials()[0].getExtension<Sheen>('KHR_materials_sheen');
	t.is(doc2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsSheen');
	t.truthy(sheen2, 'copy Sheen');
	t.deepEqual(sheen2.getSheenColorFactor(), [0.9, 0.5, 0.8], 'copy sheenColorFactor');
	t.is(sheen2.getSheenColorTexture().getName(), 'sheen', 'copy sheenColorTexture');
});
