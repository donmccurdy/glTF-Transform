require('source-map-support').install();

import test from 'tape';
import { Document } from '@gltf-transform/core';
import { listTextureSlots } from '@gltf-transform/functions';
import { KHRMaterialsSheen } from '@gltf-transform/extensions';

test('@gltf-transform/functions::listTextureSlots', (t) => {
	const document = new Document();
	const textureA = document.createTexture();
	const textureB = document.createTexture();
	const sheenExtension = document.createExtension(KHRMaterialsSheen);
	const sheen = sheenExtension.createSheen().setSheenColorTexture(textureB);
	document.createMaterial().setBaseColorTexture(textureA).setExtension('KHR_materials_sheen', sheen);
	t.deepEquals(listTextureSlots(textureA), ['baseColorTexture'], 'baseColorTexture');
	t.deepEquals(listTextureSlots(textureB), ['sheenColorTexture'], 'sheenColorTexture');
	t.end();
});
