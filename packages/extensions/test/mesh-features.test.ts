import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document } from '@gltf-transform/core';
import { EXTMeshFeatures, type Features } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';
import { createPlatformIO } from '@gltf-transform/test-utils';

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const WRITER_OPTIONS = { basename: 'extensionTest' };

describe('extensions::EXTMeshFeatures', () => {
	test('id attribute', async () => {
		const io = (await createPlatformIO()).registerExtensions([EXTMeshFeatures]);
		const srcDocument = await io.read(join(__dirname, 'in', 'EXT_mesh_features', 'FeatureIdAttribute.gltf'));

		ok(srcDocument.hasExtension('EXT_mesh_features'), 'reads EXT_mesh_features');

		const prim = srcDocument
			.getRoot()
			.listMeshes()
			.flatMap((mesh) => mesh.listPrimitives())[0];

		const features = prim.getExtension<Features>('EXT_mesh_features');
		strictEqual(features.listFeatureIDs().length, 1, 'reads 1 FeatureID');

		const featureID = features.listFeatureIDs()[0];
		strictEqual(featureID.getFeatureCount(), 4, 'reads 4 features');
		strictEqual(featureID.getAttribute(), 0, 'reads attribute');

		const jsonDocument = await io.writeJSON(srcDocument, WRITER_OPTIONS);

		const dstPrimDef = jsonDocument.json.meshes[0].primitives[0];
		const dstExtensionDef = dstPrimDef.extensions.EXT_mesh_features;
		deepEqual(dstExtensionDef, { featureIds: [{ featureCount: 4, attribute: 0 }] }, 'writes FeatureID');
	});

	test('id texture', async () => {
		const io = (await createPlatformIO()).registerExtensions([EXTMeshFeatures]);
		const srcDocument = await io.read(join(__dirname, 'in', 'EXT_mesh_features', 'FeatureIdTexture.gltf'));

		ok(srcDocument.hasExtension('EXT_mesh_features'), 'reads EXT_mesh_features');

		const prim = srcDocument
			.getRoot()
			.listMeshes()
			.flatMap((mesh) => mesh.listPrimitives())[0];

		const features = prim.getExtension<Features>('EXT_mesh_features');
		strictEqual(features.listFeatureIDs().length, 1, 'reads 1 FeatureID');

		const featureID = features.listFeatureIDs()[0];
		const featureIDTexture = featureID.getTexture();
		const texture = featureIDTexture.getTexture();

		deepEqual(featureIDTexture.getChannels(), [0], 'reads channels');
		ok(texture, 'reads texture');

		const jsonDocument = await io.writeJSON(srcDocument, WRITER_OPTIONS);

		const dstPrimDef = jsonDocument.json.meshes[0].primitives[0];
		const dstExtensionDef = dstPrimDef.extensions.EXT_mesh_features;
		deepEqual(dstExtensionDef, { featureIds: [{ featureCount: 4, texture: { index: 1 } }] }, 'writes FeatureID');
	});

	test('clone', () => {
		const doc = new Document();
		doc.createExtension(EXTMeshFeatures);

		ok(cloneDocument(doc).hasExtension('EXT_mesh_features'), 'copy EXTMeshFeatures');
	});
});
