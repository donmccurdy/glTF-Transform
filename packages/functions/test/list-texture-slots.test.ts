import test from 'ava';
import { Document } from '@gltf-transform/core';
import { listTextureSlots } from '@gltf-transform/functions';
import { KHRMaterialsSheen } from '@gltf-transform/extensions';

test('basic', (t) => {
	const document = new Document();
	const textureA = document.createTexture();
	const textureB = document.createTexture();
	const sheenExtension = document.createExtension(KHRMaterialsSheen);
	const sheen = sheenExtension.createSheen().setSheenColorTexture(textureB);
	document.createMaterial().setBaseColorTexture(textureA).setExtension('KHR_materials_sheen', sheen);
	t.deepEqual(listTextureSlots(textureA), ['baseColorTexture'], 'baseColorTexture');
	t.deepEqual(listTextureSlots(textureB), ['sheenColorTexture'], 'sheenColorTexture');
});
