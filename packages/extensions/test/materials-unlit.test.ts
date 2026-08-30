import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRMaterialsUnlit } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';

const WRITER_OPTIONS = { basename: 'extensionTest' };

describe('extensions::KHRMaterialsUnlit', () => {
	test('basic', async () => {
		const doc = new Document();
		const unlitExtension = doc.createExtension(KHRMaterialsUnlit);
		const unlit = unlitExtension.createUnlit();

		const mat = doc
			.createMaterial('MyUnlitMaterial')
			.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
			.setRoughnessFactor(1.0)
			.setMetallicFactor(0.0)
			.setExtension('KHR_materials_unlit', unlit);

		strictEqual(mat.getExtension('KHR_materials_unlit'), unlit, 'unlit is attached');

		const jsonDoc = await new NodeIO().registerExtensions([KHRMaterialsUnlit]).writeJSON(doc, WRITER_OPTIONS);
		const materialDef = jsonDoc.json.materials[0];

		deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
		deepEqual(materialDef.extensions, { KHR_materials_unlit: {} }, 'writes unlit extension');
		deepEqual(jsonDoc.json.extensionsUsed, [KHRMaterialsUnlit.EXTENSION_NAME], 'writes extensionsUsed');

		const rtDoc = await new NodeIO().registerExtensions([KHRMaterialsUnlit]).readJSON(jsonDoc);
		const rtMat = rtDoc.getRoot().listMaterials()[0];
		ok(rtMat.getExtension('KHR_materials_unlit'), 'unlit is round tripped');

		unlitExtension.dispose();

		strictEqual(mat.getExtension('KHR_materials_unlit'), null, 'unlit is detached');
	});

	test('copy', () => {
		const doc = new Document();
		const unlitExtension = doc.createExtension(KHRMaterialsUnlit);
		doc.createMaterial().setExtension('KHR_materials_unlit', unlitExtension.createUnlit());

		const doc2 = cloneDocument(doc);
		strictEqual(doc2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsUnlit');
		ok(doc2.getRoot().listMaterials()[0].getExtension('KHR_materials_unlit'), 'copy Unlit');
	});
});
