import test from 'ava';
import { Document } from '@gltf-transform/core';
import { EXTMeshGPUInstancing } from '@gltf-transform/extensions';
import { uninstance } from '@gltf-transform/functions';
import { logger } from '@gltf-transform/test-utils';

test('basic', async (t) => {
	const document = new Document().setLogger(logger);
	const buffer = document.createBuffer();

	// prettier-ignore
	const translation = document
		.createAccessor()
		.setType('VEC3')
		.setArray(new Uint8Array([
			0, 0, 0,
			0, 0, 128,
			0, 0, 255
		]))
		.setNormalized(true)
		.setBuffer(buffer);
	const id = document
		.createAccessor()
		.setType('SCALAR')
		.setArray(new Uint16Array([100, 101, 102]))
		.setBuffer(buffer);

	const batchExtension = document.createExtension(EXTMeshGPUInstancing);
	const batch = batchExtension
		.createInstancedMesh()
		.setAttribute('TRANSLATION', translation)
		.setAttribute('_INSTANCE_ID', id);

	const mesh = document.createMesh();
	const batchNode = document.createNode('Batch').setMesh(mesh).setExtension('EXT_mesh_gpu_instancing', batch);
	document.createScene().addChild(batchNode);

	await document.transform(uninstance());

	t.is(batchNode.getMesh(), null, 'batchNode.mesh == null');
	t.is(batchNode.getExtension('EXT_mesh_gpu_instancing'), null, 'node extension removed');
	t.deepEqual(document.getRoot().listExtensionsUsed(), [], 'document extension removed');

	t.deepEqual(
		batchNode.listChildren().map((child) => child.getName()),
		['Batch_0', 'Batch_1', 'Batch_2'],
		'sets instance names',
	);
	t.deepEqual(
		batchNode.listChildren().map((child) => child.getTranslation()),
		[
			[0, 0, 0],
			[0, 0, 0.5019607843137255],
			[0, 0, 1],
		],
		'sets instance translations',
	);
	t.deepEqual(
		batchNode.listChildren().map((child) => child.getExtras()),
		[{ _INSTANCE_ID: 100 }, { _INSTANCE_ID: 101 }, { _INSTANCE_ID: 102 }],
		'sets instance extras',
	);
	t.is(translation.isDisposed(), true, 'disposes translation attribute');
	t.is(id.isDisposed(), true, 'disposes id attribute');
});
