import test from 'ava';
import { Document } from '@gltf-transform/core';
import { listTextureInfo } from '@gltf-transform/functions';
import { KHRMaterialsSheen } from '@gltf-transform/extensions';

test('basic', (t) => {
	const document = new Document();
	const textureA = document.createTexture();
	const textureB = document.createTexture();

	const sheenExtension = document.createExtension(KHRMaterialsSheen);
	const sheen = sheenExtension.createSheen().setSheenRoughnessTexture(textureA);

	document.createMaterial().setBaseColorTexture(textureA).setExtension('KHR_materials_sheen', sheen);
	document.createMaterial().setOcclusionTexture(textureB).setMetallicRoughnessTexture(textureB);

	t.deepEqual(
		listTextureInfo(textureA)
			.map((info) => info.getName())
			.sort(),
		['baseColorTextureInfo', 'sheenRoughnessTextureInfo'],
		'texture A'
	);
	t.deepEqual(
		listTextureInfo(textureB)
			.map((info) => info.getName())
			.sort(),
		['metallicRoughnessTextureInfo', 'occlusionTextureInfo'],
		'texture B'
	);
});
