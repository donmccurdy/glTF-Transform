import test from 'tape';
import { Document } from '@gltf-transform/core';
import { unlit } from '../';

test('@gltf-transform/functions::unlit', async (t) => {
	const document = new Document();
	document.createMaterial();
	await document.transform(unlit());
	const unlitExtension = document.getRoot().listExtensionsUsed()[0];
	t.equals(unlitExtension.extensionName, 'KHR_materials_unlit', 'adds extension');
	t.end();
});
