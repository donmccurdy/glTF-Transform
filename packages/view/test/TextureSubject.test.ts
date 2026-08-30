import { ok, strictEqual } from 'node:assert/strict';
import { test } from 'node:test';
import { Document } from '@gltf-transform/core';
import { DocumentView, NullImageProvider } from '@gltf-transform/view';
import { JSDOM } from 'jsdom';
import { type MeshStandardMaterial, NoColorSpace, SRGBColorSpace, type Texture } from 'three';

global.document = new JSDOM().window.document;
const imageProvider = new NullImageProvider();

test('TextureSubject', async () => {
	const document = new Document();
	const textureDef = document
		.createTexture('MyTexture')
		.setImage(new Uint8Array(0))
		.setMimeType('image/png')
		.setExtras({ textureExtras: true });
	const materialDef = document
		.createMaterial()
		.setBaseColorTexture(textureDef)
		.setMetallicRoughnessTexture(textureDef);
	materialDef.getMetallicRoughnessTextureInfo()!.setTexCoord(1);

	const documentView = new DocumentView(document, { imageProvider });
	const texture = documentView.view(textureDef);
	const material = documentView.view(materialDef) as MeshStandardMaterial;
	const map = material.map as Texture;
	const metalnessMap = material.metalnessMap as Texture;
	const roughnessMap = material.roughnessMap as Texture;

	ok(texture, 'texture');
	strictEqual(map.colorSpace, SRGBColorSpace, 'map.colorSpace = "srgb"');
	strictEqual(map.channel, 0, 'map.channel = 0');
	strictEqual(roughnessMap.colorSpace, NoColorSpace, 'no color space');
	strictEqual(metalnessMap.colorSpace, NoColorSpace, 'no color space');
	strictEqual(roughnessMap.channel, 1, 'roughnessMap.channel = 1');
	strictEqual(metalnessMap.channel, 1, 'metalnessMap.channel = 1');
	ok(map.source === metalnessMap.source, 'map.source === metalnessMap.source');
	ok(metalnessMap === roughnessMap, 'metalnessMap === roughnessMap');
	strictEqual(texture.flipY || map.flipY || roughnessMap.flipY || metalnessMap.flipY, false, 'flipY=false');

	const disposed = new Set();
	texture.addEventListener('dispose', () => disposed.add(texture));
	map.addEventListener('dispose', () => disposed.add(map));
	metalnessMap.addEventListener('dispose', () => disposed.add(metalnessMap));
	roughnessMap.addEventListener('dispose', () => disposed.add(roughnessMap));

	materialDef.setBaseColorTexture(null);
	documentView.gc();

	strictEqual(disposed.size, 1, 'dispose count (1/3)');
	ok(disposed.has(map), 'dispose map');

	materialDef.dispose();
	documentView.gc();

	strictEqual(disposed.size, 2, 'dispose count (2/3)');
	ok(disposed.has(map), 'dispose roughnessMap, metalnessMap');

	textureDef.dispose();
	documentView.gc();

	strictEqual(disposed.size, 3, 'dispose count (3/3)');
	ok(disposed.has(texture), 'dispose roughnessMap, metalnessMap');
});
