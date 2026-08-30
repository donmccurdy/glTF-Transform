import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, NodeIO } from '@gltf-transform/core';
import { type Iridescence, KHRMaterialsIridescence } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';
import { createPlatformIO } from '@gltf-transform/test-utils';

const WRITER_OPTIONS = { basename: 'extensionTest' };

describe('extensions::KHRMaterialsIridescence', () => {
	test('basic', async () => {
		const doc = new Document();
		doc.createBuffer();
		const iridescenceExtension = doc.createExtension(KHRMaterialsIridescence);
		const iridescence = iridescenceExtension
			.createIridescence()
			.setIridescenceFactor(0.9)
			.setIridescenceIOR(1.5)
			.setIridescenceThicknessMinimum(50)
			.setIridescenceThicknessMaximum(500)
			.setIridescenceTexture(doc.createTexture().setImage(new Uint8Array(1)))
			.setIridescenceThicknessTexture(doc.createTexture().setImage(new Uint8Array(1)));

		const mat = doc
			.createMaterial('MyMaterial')
			.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
			.setExtension('KHR_materials_iridescence', iridescence);

		strictEqual(mat.getExtension('KHR_materials_iridescence'), iridescence, 'iridescence is attached');

		const jsonDoc = await new NodeIO().registerExtensions([KHRMaterialsIridescence]).writeJSON(doc, WRITER_OPTIONS);
		const materialDef = jsonDoc.json.materials[0];

		deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
		deepEqual(
			materialDef.extensions,
			{
				KHR_materials_iridescence: {
					iridescenceFactor: 0.9,
					iridescenceIor: 1.5,
					iridescenceThicknessMinimum: 50,
					iridescenceThicknessMaximum: 500,
					iridescenceTexture: { index: 0 },
					iridescenceThicknessTexture: { index: 1 },
				},
			},
			'writes iridescence extension',
		);
		deepEqual(jsonDoc.json.extensionsUsed, [KHRMaterialsIridescence.EXTENSION_NAME], 'writes extensionsUsed');

		iridescenceExtension.dispose();
		strictEqual(mat.getExtension('KHR_materials_iridescence'), null, 'iridescence is detached');

		const roundtripDoc = await new NodeIO().registerExtensions([KHRMaterialsIridescence]).readJSON(jsonDoc);
		const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
		const roundtripExt = roundtripMat.getExtension<Iridescence>('KHR_materials_iridescence');

		strictEqual(roundtripExt.getIridescenceFactor(), 0.9, 'reads iridescenceFactor');
		strictEqual(roundtripExt.getIridescenceIOR(), 1.5, 'reads iridescenceIOR');
		strictEqual(roundtripExt.getIridescenceThicknessMinimum(), 50, 'reads iridescenceThicknessMinimum');
		strictEqual(roundtripExt.getIridescenceThicknessMaximum(), 500, 'reads iridescenceThicknessMaximum');
		ok(roundtripExt.getIridescenceTexture(), 'reads iridescenceTexture');
		ok(roundtripExt.getIridescenceThicknessTexture(), 'reads iridescenceThicknessTexture');
	});

	test('copy', () => {
		const doc = new Document();
		const iridescenceExtension = doc.createExtension(KHRMaterialsIridescence);
		const iridescence = iridescenceExtension
			.createIridescence()
			.setIridescenceFactor(0.9)
			.setIridescenceIOR(1.5)
			.setIridescenceThicknessMinimum(50)
			.setIridescenceThicknessMaximum(500)
			.setIridescenceTexture(doc.createTexture('iridescence'))
			.setIridescenceThicknessTexture(doc.createTexture('iridescenceThickness'));
		doc.createMaterial().setExtension('KHR_materials_iridescence', iridescence);

		const doc2 = cloneDocument(doc);
		const iridescence2 = doc2.getRoot().listMaterials()[0].getExtension<Iridescence>('KHR_materials_iridescence');
		strictEqual(doc2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsIridescence');
		ok(iridescence2, 'copy Iridescence');
		strictEqual(iridescence2.getIridescenceFactor(), 0.9, 'copy iridescenceFactor');
		strictEqual(iridescence2.getIridescenceIOR(), 1.5, 'copy iridescenceIOR');
		strictEqual(iridescence2.getIridescenceThicknessMinimum(), 50, 'copy iridescenceThicknessMinimum');
		strictEqual(iridescence2.getIridescenceThicknessMaximum(), 500, 'copy iridescenceThicknessMaximum');
		strictEqual(iridescence2.getIridescenceTexture().getName(), 'iridescence', 'copy iridescenceTexture');
		strictEqual(
			iridescence2.getIridescenceThicknessTexture().getName(),
			'iridescenceThickness',
			'copy iridescenceThicknessTexture',
		);
	});

	test('extras', async () => {
		const document = new Document();
		const io = await createPlatformIO();
		io.registerExtensions([KHRMaterialsIridescence]);

		const iridescenceExtension = document.createExtension(KHRMaterialsIridescence);
		const iridescence = iridescenceExtension.createIridescence().setExtras({ hello: 'world' });

		document
			.createMaterial('MyMaterial')
			.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
			.setExtension('KHR_materials_iridescence', iridescence);

		const rtDocument = await io.readJSON(await io.writeJSON(document));
		const rtMaterial = rtDocument.getRoot().listMaterials().pop();
		const rtExtension = rtMaterial.getExtension<Iridescence>('KHR_materials_iridescence');

		deepEqual(rtExtension.getExtras(), { hello: 'world' }, 'reads/writes extras');
	});
});
