import test from 'ava';
import { Document, NodeIO } from '@gltf-transform/core';
import { Clearcoat, KHRMaterialsClearcoat } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';

const WRITER_OPTIONS = { basename: 'extensionTest' };

test('factors', async (t) => {
	const doc = new Document();
	const clearcoatExtension = doc.createExtension(KHRMaterialsClearcoat);
	const clearcoat = clearcoatExtension.createClearcoat().setClearcoatFactor(0.9).setClearcoatRoughnessFactor(0.1);

	doc.createMaterial('MyClearcoatMaterial')
		.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
		.setExtension('KHR_materials_clearcoat', clearcoat);

	const io = new NodeIO().registerExtensions([KHRMaterialsClearcoat]);
	const roundtripDoc = await io.readJSON(await io.writeJSON(doc));
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
	const roundtripExt = roundtripMat.getExtension<Clearcoat>('KHR_materials_clearcoat');

	t.is(roundtripExt.getClearcoatFactor(), 0.9, 'reads clearcoatFactor');
	t.is(roundtripExt.getClearcoatRoughnessFactor(), 0.1, 'reads clearcoatFactor');
});

test('textures', async (t) => {
	const doc = new Document();
	doc.createBuffer();
	const clearcoatExtension = doc.createExtension(KHRMaterialsClearcoat);
	const clearcoat = clearcoatExtension
		.createClearcoat()
		.setClearcoatFactor(0.9)
		.setClearcoatTexture(doc.createTexture().setImage(new Uint8Array(1)))
		.setClearcoatRoughnessTexture(doc.createTexture().setImage(new Uint8Array(1)))
		.setClearcoatNormalTexture(doc.createTexture().setImage(new Uint8Array(1)))
		.setClearcoatNormalScale(2.0)
		.setClearcoatRoughnessFactor(0.1);

	const mat = doc
		.createMaterial('MyClearcoatMaterial')
		.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
		.setExtension('KHR_materials_clearcoat', clearcoat);

	t.is(mat.getExtension('KHR_materials_clearcoat'), clearcoat, 'clearcoat is attached');

	const jsonDoc = await new NodeIO().registerExtensions([KHRMaterialsClearcoat]).writeJSON(doc, WRITER_OPTIONS);
	const materialDef = jsonDoc.json.materials[0];

	t.deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
	t.deepEqual(
		materialDef.extensions,
		{
			KHR_materials_clearcoat: {
				clearcoatFactor: 0.9,
				clearcoatRoughnessFactor: 0.1,
				clearcoatTexture: { index: 0 },
				clearcoatRoughnessTexture: { index: 1 },
				clearcoatNormalTexture: { index: 2, scale: 2 },
			},
		},
		'writes clearcoat extension',
	);
	t.deepEqual(jsonDoc.json.extensionsUsed, [KHRMaterialsClearcoat.EXTENSION_NAME], 'writes extensionsUsed');

	clearcoatExtension.dispose();
	t.is(mat.getExtension('KHR_materials_clearcoat'), null, 'clearcoat is detached');

	const roundtripDoc = await new NodeIO().registerExtensions([KHRMaterialsClearcoat]).readJSON(jsonDoc);
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
	const roundtripExt = roundtripMat.getExtension<Clearcoat>('KHR_materials_clearcoat');

	t.is(roundtripExt.getClearcoatFactor(), 0.9, 'reads clearcoatFactor');
	t.is(roundtripExt.getClearcoatRoughnessFactor(), 0.1, 'reads clearcoatFactor');
	t.truthy(roundtripExt.getClearcoatTexture(), 'reads clearcoatTexture');
	t.truthy(roundtripExt.getClearcoatRoughnessTexture(), 'reads clearcoatRoughnessTexture');
	t.truthy(roundtripExt.getClearcoatNormalTexture(), 'reads clearcoatNormalTexture');
	t.is(roundtripExt.getClearcoatNormalScale(), 2, 'reads clearcoatNormalScale');
});

test('disabled', async (t) => {
	const doc = new Document();
	doc.createExtension(KHRMaterialsClearcoat);
	doc.createMaterial();

	const io = new NodeIO().registerExtensions([KHRMaterialsClearcoat]);
	const roundtripDoc = await io.readJSON(await io.writeJSON(doc));
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
	t.is(roundtripMat.getExtension('KHR_materials_clearcoat'), null, 'no effect when not attached');
});

test('copy', (t) => {
	const doc = new Document();
	const clearcoatExtension = doc.createExtension(KHRMaterialsClearcoat);
	const clearcoat = clearcoatExtension
		.createClearcoat()
		.setClearcoatFactor(0.9)
		.setClearcoatRoughnessFactor(0.1)
		.setClearcoatNormalScale(0.5)
		.setClearcoatTexture(doc.createTexture('cc'))
		.setClearcoatRoughnessTexture(doc.createTexture('ccrough'))
		.setClearcoatNormalTexture(doc.createTexture('ccnormal'));
	doc.createMaterial().setExtension('KHR_materials_clearcoat', clearcoat);

	const doc2 = cloneDocument(doc);
	const clearcoat2 = doc2.getRoot().listMaterials()[0].getExtension<Clearcoat>('KHR_materials_clearcoat');
	t.is(doc2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsClearcoat');
	t.truthy(clearcoat2, 'copy Clearcoat');
	t.is(clearcoat2.getClearcoatFactor(), 0.9, 'copy clearcoatFactor');
	t.is(clearcoat2.getClearcoatRoughnessFactor(), 0.1, 'copy clearcoatFactor');
	t.is(clearcoat2.getClearcoatNormalScale(), 0.5, 'copy clearcoatFactor');
	t.is(clearcoat2.getClearcoatTexture().getName(), 'cc', 'copy clearcoatTexture');
	t.is(clearcoat2.getClearcoatRoughnessTexture().getName(), 'ccrough', 'copy clearcoatRoughnessTexture');
	t.is(clearcoat2.getClearcoatNormalTexture().getName(), 'ccnormal', 'copy clearcoatNormalTexture');
});
