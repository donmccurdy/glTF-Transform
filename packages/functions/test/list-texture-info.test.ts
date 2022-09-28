require('source-map-support').install();

import test from 'tape';
import { Document } from '@gltf-transform/core';
import { listTextureInfo } from '@gltf-transform/functions';
import { MaterialsSheen } from '@gltf-transform/extensions';

test('@gltf-transform/functions::listTextureInfo', (t) => {
	const document = new Document();
	const textureA = document.createTexture();
	const textureB = document.createTexture();

	const sheenExtension = document.createExtension(MaterialsSheen);
	const sheen = sheenExtension.createSheen().setSheenRoughnessTexture(textureA);

	document.createMaterial().setBaseColorTexture(textureA).setExtension('KHR_materials_sheen', sheen);
	document.createMaterial().setOcclusionTexture(textureB).setMetallicRoughnessTexture(textureB);

	t.deepEquals(
		listTextureInfo(document, textureA)
			.map((info) => info.getName())
			.sort(),
		['baseColorTextureInfo', 'sheenRoughnessTextureInfo'],
		'texture A'
	);
	t.deepEquals(
		listTextureInfo(document, textureB)
			.map((info) => info.getName())
			.sort(),
		['metallicRoughnessTextureInfo', 'occlusionTextureInfo'],
		'texture B'
	);
	t.end();
});
