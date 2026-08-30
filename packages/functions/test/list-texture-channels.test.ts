import { deepEqual, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, TextureChannel } from '@gltf-transform/core';
import { KHRMaterialsSheen } from '@gltf-transform/extensions';
import { getTextureChannelMask, listTextureChannels } from '@gltf-transform/functions';

const { R, G, B, A } = TextureChannel;

describe('functions::listTextureChannels', () => {
	test('listTextureChannels', () => {
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

		deepEqual(listTextureChannels(textureA), [R, G, B, A], 'baseColorTexture RGBA');
		deepEqual(listTextureChannels(textureB), [A], 'sheenColorTexture A');

		material.setAlphaMode('OPAQUE');
		deepEqual(listTextureChannels(textureA), [R, G, B], 'baseColorTexture RGB');

		sheen.setSheenColorTexture(textureB);
		deepEqual(listTextureChannels(textureB), [R, G, B, A], 'sheenColorTexture RGBA');
	});

	test('getTextureChannelMask', () => {
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

		strictEqual(getTextureChannelMask(textureA), R | G | B | A, 'baseColorTexture RGBA');
		strictEqual(getTextureChannelMask(textureB), A, 'sheenColorTexture A');

		material.setAlphaMode('OPAQUE');
		strictEqual(getTextureChannelMask(textureA), R | G | B, 'baseColorTexture RGB');

		sheen.setSheenColorTexture(textureB);
		strictEqual(getTextureChannelMask(textureB), R | G | B | A, 'sheenColorTexture RGBA');
	});
});
