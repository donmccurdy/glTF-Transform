import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, NodeIO } from '@gltf-transform/core';
import { type Clearcoat, KHRMaterialsClearcoat } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';
import { createPlatformIO } from '@gltf-transform/test-utils';

const WRITER_OPTIONS = { basename: 'extensionTest' };

describe('extensions::KHRMaterialsClearcoat', () => {
	test('factors', async () => {
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

		strictEqual(roundtripExt.getClearcoatFactor(), 0.9, 'reads clearcoatFactor');
		strictEqual(roundtripExt.getClearcoatRoughnessFactor(), 0.1, 'reads clearcoatFactor');
	});

	test('textures', async () => {
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

		strictEqual(mat.getExtension('KHR_materials_clearcoat'), clearcoat, 'clearcoat is attached');

		const jsonDoc = await new NodeIO().registerExtensions([KHRMaterialsClearcoat]).writeJSON(doc, WRITER_OPTIONS);
		const materialDef = jsonDoc.json.materials[0];

		deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
		deepEqual(
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
		deepEqual(jsonDoc.json.extensionsUsed, [KHRMaterialsClearcoat.EXTENSION_NAME], 'writes extensionsUsed');

		clearcoatExtension.dispose();
		strictEqual(mat.getExtension('KHR_materials_clearcoat'), null, 'clearcoat is detached');

		const roundtripDoc = await new NodeIO().registerExtensions([KHRMaterialsClearcoat]).readJSON(jsonDoc);
		const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
		const roundtripExt = roundtripMat.getExtension<Clearcoat>('KHR_materials_clearcoat');

		strictEqual(roundtripExt.getClearcoatFactor(), 0.9, 'reads clearcoatFactor');
		strictEqual(roundtripExt.getClearcoatRoughnessFactor(), 0.1, 'reads clearcoatFactor');
		ok(roundtripExt.getClearcoatTexture(), 'reads clearcoatTexture');
		ok(roundtripExt.getClearcoatRoughnessTexture(), 'reads clearcoatRoughnessTexture');
		ok(roundtripExt.getClearcoatNormalTexture(), 'reads clearcoatNormalTexture');
		strictEqual(roundtripExt.getClearcoatNormalScale(), 2, 'reads clearcoatNormalScale');
	});

	test('disabled', async () => {
		const doc = new Document();
		doc.createExtension(KHRMaterialsClearcoat);
		doc.createMaterial();

		const io = new NodeIO().registerExtensions([KHRMaterialsClearcoat]);
		const roundtripDoc = await io.readJSON(await io.writeJSON(doc));
		const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
		strictEqual(roundtripMat.getExtension('KHR_materials_clearcoat'), null, 'no effect when not attached');
	});

	test('copy', () => {
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
		strictEqual(doc2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsClearcoat');
		ok(clearcoat2, 'copy Clearcoat');
		strictEqual(clearcoat2.getClearcoatFactor(), 0.9, 'copy clearcoatFactor');
		strictEqual(clearcoat2.getClearcoatRoughnessFactor(), 0.1, 'copy clearcoatFactor');
		strictEqual(clearcoat2.getClearcoatNormalScale(), 0.5, 'copy clearcoatFactor');
		strictEqual(clearcoat2.getClearcoatTexture().getName(), 'cc', 'copy clearcoatTexture');
		strictEqual(clearcoat2.getClearcoatRoughnessTexture().getName(), 'ccrough', 'copy clearcoatRoughnessTexture');
		strictEqual(clearcoat2.getClearcoatNormalTexture().getName(), 'ccnormal', 'copy clearcoatNormalTexture');
	});

	test('extras', async () => {
		const document = new Document();
		const io = await createPlatformIO();
		io.registerExtensions([KHRMaterialsClearcoat]);

		const clearcoatExtension = document.createExtension(KHRMaterialsClearcoat);
		const clearcoat = clearcoatExtension.createClearcoat().setExtras({ hello: 'world' });

		document
			.createMaterial('MyMaterial')
			.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
			.setExtension('KHR_materials_clearcoat', clearcoat);

		const rtDocument = await io.readJSON(await io.writeJSON(document));
		const rtMaterial = rtDocument.getRoot().listMaterials().pop();
		const rtExtension = rtMaterial.getExtension<Clearcoat>('KHR_materials_clearcoat');

		deepEqual(rtExtension.getExtras(), { hello: 'world' }, 'reads/writes extras');
	});
});
