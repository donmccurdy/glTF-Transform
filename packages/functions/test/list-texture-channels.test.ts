require('source-map-support').install();

import test from 'tape';
import { Document, TextureChannel } from '@gltf-transform/core';
import { listTextureChannels, getTextureChannelMask } from '@gltf-transform/functions';
import { MaterialsSheen } from '@gltf-transform/extensions';

const { R, G, B, A } = TextureChannel;

test('@gltf-transform/functions::listTextureChannels', (t) => {
	const document = new Document();
	const textureA = document.createTexture();
	const textureB = document.createTexture();
	const sheenExtension = document.createExtension(MaterialsSheen);
	const sheen = sheenExtension.createSheen().setSheenRoughnessTexture(textureB);
	const material = document
		.createMaterial()
		.setAlphaMode('BLEND')
		.setBaseColorTexture(textureA)
		.setExtension('KHR_materials_sheen', sheen);

	t.deepEquals(listTextureChannels(document, textureA), [R, G, B, A], 'baseColorTexture RGBA');
	t.deepEquals(listTextureChannels(document, textureB), [A], 'sheenColorTexture A');

	material.setAlphaMode('OPAQUE');
	t.deepEquals(listTextureChannels(document, textureA), [R, G, B], 'baseColorTexture RGB');

	sheen.setSheenColorTexture(textureB);
	t.deepEquals(listTextureChannels(document, textureB), [R, G, B, A], 'sheenColorTexture RGBA');
	t.end();
});

test('@gltf-transform/functions::getTextureChannelMask', (t) => {
	const document = new Document();
	const textureA = document.createTexture();
	const textureB = document.createTexture();
	const sheenExtension = document.createExtension(MaterialsSheen);
	const sheen = sheenExtension.createSheen().setSheenRoughnessTexture(textureB);
	const material = document
		.createMaterial()
		.setAlphaMode('BLEND')
		.setBaseColorTexture(textureA)
		.setExtension('KHR_materials_sheen', sheen);

	t.equals(getTextureChannelMask(document, textureA), R | G | B | A, 'baseColorTexture RGBA');
	t.equals(getTextureChannelMask(document, textureB), A, 'sheenColorTexture A');

	material.setAlphaMode('OPAQUE');
	t.equals(getTextureChannelMask(document, textureA), R | G | B, 'baseColorTexture RGB');

	sheen.setSheenColorTexture(textureB);
	t.equals(getTextureChannelMask(document, textureB), R | G | B | A, 'sheenColorTexture RGBA');
	t.end();
});
