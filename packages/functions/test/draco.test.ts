import test from 'ava';
import { Document } from '@gltf-transform/core';
import { draco } from '@gltf-transform/functions';

test('basic', async (t) => {
	const document = new Document();
	await document.transform(draco({ method: 'edgebreaker' }));
	await document.transform(draco({ method: 'sequential' }));
	const dracoExtension = document.getRoot().listExtensionsUsed()[0];
	t.is(dracoExtension.extensionName, 'KHR_draco_mesh_compression', 'adds extension');
});
