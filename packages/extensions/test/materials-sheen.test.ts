import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRMaterialsSheen, type Sheen } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';
import { createPlatformIO } from '@gltf-transform/test-utils';

const WRITER_OPTIONS = { basename: 'extensionTest' };

describe('extensions::KHRMaterialsSheen', () => {
	test('basic', async () => {
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

		strictEqual(mat.getExtension('KHR_materials_sheen'), sheen, 'sheen is attached');

		const jsonDoc = await new NodeIO().registerExtensions([KHRMaterialsSheen]).writeJSON(doc, WRITER_OPTIONS);
		const materialDef = jsonDoc.json.materials[0];

		deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
		deepEqual(
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
		deepEqual(jsonDoc.json.extensionsUsed, [KHRMaterialsSheen.EXTENSION_NAME], 'writes extensionsUsed');

		sheenExtension.dispose();
		strictEqual(mat.getExtension('KHR_materials_sheen'), null, 'sheen is detached');

		const roundtripDoc = await new NodeIO().registerExtensions([KHRMaterialsSheen]).readJSON(jsonDoc);
		const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
		const roundtripExt = roundtripMat.getExtension<Sheen>('KHR_materials_sheen');

		deepEqual(roundtripExt.getSheenColorFactor(), [0.9, 0.5, 0.8], 'reads sheenColorFactor');
		ok(roundtripExt.getSheenColorTexture(), 'reads sheenColorTexture');
	});

	test('copy', () => {
		const doc = new Document();
		const sheenExtension = doc.createExtension(KHRMaterialsSheen);
		const sheen = sheenExtension
			.createSheen()
			.setSheenColorFactor([0.9, 0.5, 0.8])
			.setSheenColorTexture(doc.createTexture('sheen'));
		doc.createMaterial().setExtension('KHR_materials_sheen', sheen);

		const doc2 = cloneDocument(doc);
		const sheen2 = doc2.getRoot().listMaterials()[0].getExtension<Sheen>('KHR_materials_sheen');
		strictEqual(doc2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsSheen');
		ok(sheen2, 'copy Sheen');
		deepEqual(sheen2.getSheenColorFactor(), [0.9, 0.5, 0.8], 'copy sheenColorFactor');
		strictEqual(sheen2.getSheenColorTexture().getName(), 'sheen', 'copy sheenColorTexture');
	});

	test('extras', async () => {
		const document = new Document();
		const io = await createPlatformIO();
		io.registerExtensions([KHRMaterialsSheen]);

		const sheenExtension = document.createExtension(KHRMaterialsSheen);
		const sheen = sheenExtension.createSheen().setExtras({ hello: 'world' });

		document
			.createMaterial('MyMaterial')
			.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
			.setExtension('KHR_materials_sheen', sheen);

		const rtDocument = await io.readJSON(await io.writeJSON(document));
		const rtMaterial = rtDocument.getRoot().listMaterials().pop();
		const rtExtension = rtMaterial.getExtension<Sheen>('KHR_materials_sheen');

		deepEqual(rtExtension.getExtras(), { hello: 'world' }, 'reads/writes extras');
	});
});
