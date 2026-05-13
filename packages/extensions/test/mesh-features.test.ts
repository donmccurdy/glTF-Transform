import { Document } from '@gltf-transform/core';
import { EXTMeshFeatures, type Features } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';
import { createPlatformIO } from '@gltf-transform/test-utils';
import test from 'ava';

import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const WRITER_OPTIONS = { basename: 'extensionTest' };

test('id attribute', async (t) => {
	const io = (await createPlatformIO()).registerExtensions([EXTMeshFeatures]);
	const srcDocument = await io.read(path.join(__dirname, 'in', 'EXT_mesh_features', 'FeatureIdAttribute.gltf'));

	t.true(srcDocument.hasExtension('EXT_mesh_features'), 'reads EXT_mesh_features');

	const prim = srcDocument
		.getRoot()
		.listMeshes()
		.flatMap((mesh) => mesh.listPrimitives())[0];

	const features = prim.getExtension<Features>('EXT_mesh_features');
	t.is(features.listFeatureIDs().length, 1, 'reads 1 FeatureID');

	const featureID = features.listFeatureIDs()[0];
	t.is(featureID.getFeatureCount(), 4, 'reads 4 features');
	t.is(featureID.getAttribute(), 0, 'reads attribute');

	const jsonDocument = await io.writeJSON(srcDocument, WRITER_OPTIONS);

	const dstPrimDef = jsonDocument.json.meshes[0].primitives[0];
	const dstExtensionDef = dstPrimDef.extensions.EXT_mesh_features;
	t.deepEqual(dstExtensionDef, { featureIds: [{ featureCount: 4, attribute: 0 }] }, 'writes FeatureID');
});

test('id texture', async (t) => {
	const io = (await createPlatformIO()).registerExtensions([EXTMeshFeatures]);
	const srcDocument = await io.read(path.join(__dirname, 'in', 'EXT_mesh_features', 'FeatureIdAttribute.gltf'));

	t.true(srcDocument.hasExtension('EXT_mesh_features'), 'reads EXT_mesh_features');
});

test('clone', (t) => {
	const doc = new Document();
	doc.createExtension(EXTMeshFeatures);

	t.is(cloneDocument(doc).getRoot().listExtensionsUsed().length, 1, 'copy EXTMeshFeatures');
});
