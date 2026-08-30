import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document } from '@gltf-transform/core';
import { KHRMaterialsSheen, KHRMaterialsVolume } from '@gltf-transform/extensions';
import { listTextureInfo, listTextureInfoByMaterial } from '@gltf-transform/functions';

describe('functions::listTextureInfo', () => {
	test('listTextureInfo', () => {
		const document = new Document();
		const textureA = document.createTexture();
		const textureB = document.createTexture();

		const sheenExtension = document.createExtension(KHRMaterialsSheen);
		const sheen = sheenExtension.createSheen().setSheenRoughnessTexture(textureA);

		document.createMaterial().setBaseColorTexture(textureA).setExtension('KHR_materials_sheen', sheen);
		document.createMaterial().setOcclusionTexture(textureB).setMetallicRoughnessTexture(textureB);

		deepEqual(
			listTextureInfo(textureA)
				.map((info) => info.getName())
				.sort(),
			['baseColorTextureInfo', 'sheenRoughnessTextureInfo'],
			'texture A',
		);
		deepEqual(
			listTextureInfo(textureB)
				.map((info) => info.getName())
				.sort(),
			['metallicRoughnessTextureInfo', 'occlusionTextureInfo'],
			'texture B',
		);
	});

	test('listTextureInfoByMaterial', () => {
		const document = new Document();
		const textureA = document.createTexture();
		const textureB = document.createTexture();
		const textureC = document.createTexture();
		const volumeExtension = document.createExtension(KHRMaterialsVolume);
		const volume = volumeExtension.createVolume().setThicknessTexture(textureC);
		const materialA = document
			.createMaterial()
			.setBaseColorTexture(textureA)
			.setNormalTexture(textureB)
			.setExtension('KHR_materials_volume', volume);
		const materialB = document.createMaterial().setBaseColorTexture(textureA);

		let textureInfo = new Set(listTextureInfoByMaterial(materialA));
		strictEqual(textureInfo.size, 3, 'finds TextureInfo x 3');
		ok(textureInfo.has(materialA.getBaseColorTextureInfo()), 'finds material.baseColorTextureInfo');
		ok(textureInfo.has(materialA.getNormalTextureInfo()), 'finds material.normalTextureInfo');
		ok(textureInfo.has(volume.getThicknessTextureInfo()), 'finds material.volume.thicknessTextureInfo');

		textureInfo = new Set(listTextureInfoByMaterial(materialB));
		strictEqual(textureInfo.size, 1, 'finds TextureInfo x 1');
	});
});
