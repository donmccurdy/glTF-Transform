import { deepEqual, strictEqual, throws } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, type GLTF, ImageUtils, type JSONDocument, NodeIO } from '@gltf-transform/core';
import { KHRTextureBasisu } from '@gltf-transform/extensions';
import fs from 'fs';
import path from 'path';

const WRITER_OPTIONS = { basename: 'extensionTest' };

const io = new NodeIO().registerExtensions([KHRTextureBasisu]);
const __dirname = path.dirname(new URL(import.meta.url).pathname);

describe('extensions::KHRTextureBasisu', () => {
	test('basic', async () => {
		const doc = new Document();
		doc.createBuffer();
		const basisuExtension = doc.createExtension(KHRTextureBasisu);
		const tex1 = doc.createTexture('BasisTexture').setMimeType('image/ktx2').setImage(new Uint8Array(10));
		const tex2 = doc.createTexture('PNGTexture').setMimeType('image/png').setImage(new Uint8Array(15));
		doc.createMaterial().setBaseColorTexture(tex1).setEmissiveTexture(tex2);

		let jsonDoc: JSONDocument;

		jsonDoc = await io.writeJSON(doc, WRITER_OPTIONS);

		// Writing to file.
		deepEqual(jsonDoc.json.extensionsUsed, [KHRTextureBasisu.EXTENSION_NAME], 'writes extensionsUsed');
		strictEqual(jsonDoc.json.textures[0].source, undefined, 'omits .source on KTX2 texture');
		strictEqual(jsonDoc.json.textures[1].source, 1, 'includes .source on PNG texture');
		strictEqual(
			(jsonDoc.json.textures[0].extensions['KHR_texture_basisu'] as GLTF.ITexture).source,
			0,
			'includes .source on KTX2 extension',
		);

		// Read (roundtrip) from file.
		const rtDoc = await io.readJSON(jsonDoc);
		const rtRoot = rtDoc.getRoot();
		strictEqual(rtRoot.listTextures()[0].getMimeType(), 'image/ktx2', 'reads KTX2 mimetype');
		strictEqual(rtRoot.listTextures()[1].getMimeType(), 'image/png', 'reads PNG mimetype');
		strictEqual(rtRoot.listTextures()[0].getImage().byteLength, 10, 'reads KTX2 payload');
		strictEqual(rtRoot.listTextures()[1].getImage().byteLength, 15, 'reads PNG payload');

		// Clean up extension data, revert to core glTF.
		basisuExtension.dispose();
		tex1.dispose();
		jsonDoc = await io.writeJSON(doc, WRITER_OPTIONS);
		strictEqual(jsonDoc.json.extensionsUsed, undefined, 'clears extensionsUsed');
		strictEqual(jsonDoc.json.textures.length, 1, 'writes only 1 texture');
		strictEqual(jsonDoc.json.textures[0].source, 0, 'includes .source on PNG texture');
	});

	test('image-utils | basic', () => {
		throws(() => ImageUtils.getSize(new Uint8Array(10), 'image/ktx2'), undefined, 'corrupt file');
		strictEqual(ImageUtils.extensionToMimeType('ktx2'), 'image/ktx2', 'extensionToMimeType, inferred');
	});

	test('image-utils | etc1s', () => {
		const ktx2 = fs.readFileSync(path.join(__dirname, 'in', '2d_etc1s.ktx2'));

		deepEqual(ImageUtils.getSize(ktx2, 'image/ktx2'), [40, 40], 'size');
		strictEqual(ImageUtils.getChannels(ktx2, 'image/ktx2'), 3, 'channels');
		strictEqual(ImageUtils.getVRAMByteLength(ktx2, 'image/ktx2'), 1065, 'gpuSize');
	});

	test('image-utils | uastc', () => {
		const ktx2 = fs.readFileSync(path.join(__dirname, 'in', '2d_uastc.ktx2'));

		deepEqual(ImageUtils.getSize(ktx2, 'image/ktx2'), [40, 40], 'size');
		strictEqual(ImageUtils.getChannels(ktx2, 'image/ktx2'), 3, 'channels');
		strictEqual(ImageUtils.getVRAMByteLength(ktx2, 'image/ktx2'), 2240, 'gpuSize');
	});

	test('image-utils | rgb8', () => {
		const ktx2 = fs.readFileSync(path.join(__dirname, 'in', '2d_rgb8.ktx2'));

		deepEqual(ImageUtils.getSize(ktx2, 'image/ktx2'), [40, 40], 'size');
		strictEqual(ImageUtils.getChannels(ktx2, 'image/ktx2'), 3, 'channels');
		strictEqual(ImageUtils.getVRAMByteLength(ktx2, 'image/ktx2'), 6390, 'gpuSize');
	});

	test('image-utils | rgba8', () => {
		const ktx2 = fs.readFileSync(path.join(__dirname, 'in', '2d_rgba8.ktx2'));

		deepEqual(ImageUtils.getSize(ktx2, 'image/ktx2'), [40, 40], 'size');
		strictEqual(ImageUtils.getChannels(ktx2, 'image/ktx2'), 4, 'channels');
		strictEqual(ImageUtils.getVRAMByteLength(ktx2, 'image/ktx2'), 8520, 'gpuSize');
	});

	test('image-utils | rgba16', () => {
		const ktx2 = fs.readFileSync(path.join(__dirname, 'in', '2d_rgba16_linear.ktx2'));

		deepEqual(ImageUtils.getSize(ktx2, 'image/ktx2'), [40, 40], 'size');
		strictEqual(ImageUtils.getChannels(ktx2, 'image/ktx2'), 4, 'channels');
		strictEqual(ImageUtils.getVRAMByteLength(ktx2, 'image/ktx2'), 17040, 'gpuSize');
	});

	test('image-utils | rgba32', () => {
		const ktx2 = fs.readFileSync(path.join(__dirname, 'in', '2d_rgba32_linear.ktx2'));

		deepEqual(ImageUtils.getSize(ktx2, 'image/ktx2'), [40, 40], 'size');
		strictEqual(ImageUtils.getChannels(ktx2, 'image/ktx2'), 4, 'channels');
		strictEqual(ImageUtils.getVRAMByteLength(ktx2, 'image/ktx2'), 34080, 'gpuSize');
	});

	test('image-utils | astc4x4', () => {
		const ktx2 = fs.readFileSync(path.join(__dirname, 'in', '2d_astc4x4.ktx2'));

		deepEqual(ImageUtils.getSize(ktx2, 'image/ktx2'), [40, 40], 'size');
		throws(() => ImageUtils.getChannels(ktx2, 'image/ktx2'), { message: /vkFormat/ }, 'channels');
		strictEqual(ImageUtils.getVRAMByteLength(ktx2, 'image/ktx2'), 2240, 'gpuSize');
	});

	test('image-utils | bc1', () => {
		const ktx2 = fs.readFileSync(path.join(__dirname, 'in', '2d_bc1.ktx2'));

		deepEqual(ImageUtils.getSize(ktx2, 'image/ktx2'), [40, 40], 'size');
		throws(() => ImageUtils.getChannels(ktx2, 'image/ktx2'), { message: /vkFormat/ }, 'channels');
		strictEqual(ImageUtils.getVRAMByteLength(ktx2, 'image/ktx2'), 1120, 'gpuSize');
	});

	test('image-utils | bc7', () => {
		const ktx2 = fs.readFileSync(path.join(__dirname, 'in', '2d_bc7.ktx2'));

		deepEqual(ImageUtils.getSize(ktx2, 'image/ktx2'), [40, 40], 'size');
		throws(() => ImageUtils.getChannels(ktx2, 'image/ktx2'), { message: /vkFormat/ }, 'channels');
		strictEqual(ImageUtils.getVRAMByteLength(ktx2, 'image/ktx2'), 2240, 'gpuSize');
	});
});
