import { deepEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document } from '@gltf-transform/core';
import { KHRMaterialsSheen } from '@gltf-transform/extensions';
import { listTextureSlots } from '@gltf-transform/functions';

describe('functions::listTextureSlots', () => {
	test('basic', () => {
		const document = new Document();
		const textureA = document.createTexture();
		const textureB = document.createTexture();
		const sheenExtension = document.createExtension(KHRMaterialsSheen);
		const sheen = sheenExtension.createSheen().setSheenColorTexture(textureB);
		document.createMaterial().setBaseColorTexture(textureA).setExtension('KHR_materials_sheen', sheen);
		deepEqual(listTextureSlots(textureA), ['baseColorTexture'], 'baseColorTexture');
		deepEqual(listTextureSlots(textureB), ['sheenColorTexture'], 'sheenColorTexture');
	});
});
