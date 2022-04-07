import test from 'tape';
import { Document } from '@gltf-transform/core';
import { draco } from '../';

test('@gltf-transform/functions::draco', async (t) => {
	const document = new Document();
	await document.transform(draco({ method: 'edgebreaker' }));
	await document.transform(draco({ method: 'sequential' }));
	const dracoExtension = document.getRoot().listExtensionsUsed()[0];
	t.equals(dracoExtension.extensionName, 'KHR_draco_mesh_compression', 'adds extension');
	t.end();
});
