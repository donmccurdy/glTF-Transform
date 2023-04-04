import test from 'ava';
import { Document, TextureChannel } from '@gltf-transform/core';
import { listTextureChannels, getTextureChannelMask } from '@gltf-transform/functions';
import { KHRMaterialsSheen } from '@gltf-transform/extensions';

const { R, G, B, A } = TextureChannel;

test('listTextureChannels', (t) => {
	const document = new Document();
	const textureA = document.createTexture();
	const textureB = document.createTexture();
	const sheenExtension = document.createExtension(KHRMaterialsSheen);
	const sheen = sheenExtension.createSheen().setSheenRoughnessTexture(textureB);
	const material = document
		.createMaterial()
		.setAlphaMode('BLEND')
		.setBaseColorTexture(textureA)
		.setExtension('KHR_materials_sheen', sheen);

	t.deepEqual(listTextureChannels(textureA), [R, G, B, A], 'baseColorTexture RGBA');
	t.deepEqual(listTextureChannels(textureB), [A], 'sheenColorTexture A');

	material.setAlphaMode('OPAQUE');
	t.deepEqual(listTextureChannels(textureA), [R, G, B], 'baseColorTexture RGB');

	sheen.setSheenColorTexture(textureB);
	t.deepEqual(listTextureChannels(textureB), [R, G, B, A], 'sheenColorTexture RGBA');
});

test('getTextureChannelMask', (t) => {
	const document = new Document();
	const textureA = document.createTexture();
	const textureB = document.createTexture();
	const sheenExtension = document.createExtension(KHRMaterialsSheen);
	const sheen = sheenExtension.createSheen().setSheenRoughnessTexture(textureB);
	const material = document
		.createMaterial()
		.setAlphaMode('BLEND')
		.setBaseColorTexture(textureA)
		.setExtension('KHR_materials_sheen', sheen);

	t.is(getTextureChannelMask(textureA), R | G | B | A, 'baseColorTexture RGBA');
	t.is(getTextureChannelMask(textureB), A, 'sheenColorTexture A');

	material.setAlphaMode('OPAQUE');
	t.is(getTextureChannelMask(textureA), R | G | B, 'baseColorTexture RGB');

	sheen.setSheenColorTexture(textureB);
	t.is(getTextureChannelMask(textureB), R | G | B | A, 'sheenColorTexture RGBA');
});
