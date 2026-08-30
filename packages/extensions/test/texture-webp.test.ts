import { deepEqual, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { BufferUtils, Document, type GLTF, ImageUtils, type JSONDocument, NodeIO } from '@gltf-transform/core';
import { EXTTextureWebP } from '@gltf-transform/extensions';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const WRITER_OPTIONS = { basename: 'extensionTest' };

const io = new NodeIO().registerExtensions([EXTTextureWebP]);
const __dirname = dirname(fileURLToPath(import.meta.url));

describe('extensions::EXTTextureWebP', () => {
	test('basic', async () => {
		const doc = new Document();
		doc.createBuffer();
		const webpExtension = doc.createExtension(EXTTextureWebP);
		const tex1 = doc.createTexture('WebPTexture').setMimeType('image/webp').setImage(new Uint8Array(10));
		const tex2 = doc.createTexture('PNGTexture').setMimeType('image/png').setImage(new Uint8Array(15));
		doc.createMaterial().setBaseColorTexture(tex1).setEmissiveTexture(tex2);

		let jsonDoc: JSONDocument;

		jsonDoc = await io.writeJSON(doc, WRITER_OPTIONS);

		// Writing to file.
		deepEqual(jsonDoc.json.extensionsUsed, ['EXT_texture_webp'], 'writes extensionsUsed');
		strictEqual(jsonDoc.json.textures[0].source, undefined, 'omits .source on WebP texture');
		strictEqual(jsonDoc.json.textures[1].source, 1, 'includes .source on PNG texture');
		strictEqual(
			(jsonDoc.json.textures[0].extensions['EXT_texture_webp'] as GLTF.ITexture).source,
			0,
			'includes .source on WebP extension',
		);

		// Read (roundtrip) from file.
		const rtDoc = await io.readJSON(jsonDoc);
		const rtRoot = rtDoc.getRoot();
		strictEqual(rtRoot.listTextures()[0].getMimeType(), 'image/webp', 'reads WebP mimetype');
		strictEqual(rtRoot.listTextures()[1].getMimeType(), 'image/png', 'reads PNG mimetype');
		strictEqual(rtRoot.listTextures()[0].getImage().byteLength, 10, 'reads WebP payload');
		strictEqual(rtRoot.listTextures()[1].getImage().byteLength, 15, 'reads PNG payload');

		// Clean up extension data, revert to core glTF.
		webpExtension.dispose();
		tex1.dispose();
		jsonDoc = await io.writeJSON(doc, WRITER_OPTIONS);
		strictEqual(jsonDoc.json.extensionsUsed, undefined, 'clears extensionsUsed');
		strictEqual(jsonDoc.json.textures.length, 1, 'writes only 1 texture');
		strictEqual(jsonDoc.json.textures[0].source, 0, 'includes .source on PNG texture');
	});

	test('image-utils', () => {
		const webpLossy = fs.readFileSync(path.join(__dirname, 'in', 'test-lossy.webp'));
		const webpLossless = fs.readFileSync(path.join(__dirname, 'in', 'test-lossless.webp'));
		const buffer = BufferUtils.concat([
			BufferUtils.encodeText('RIFF'),
			new Uint8Array(4),
			BufferUtils.encodeText('WEBP'),
			BufferUtils.encodeText('OTHR'),
			new Uint8Array([999, 0, 0, 0]),
		]);

		strictEqual(ImageUtils.getSize(new Uint8Array(8), 'image/webp'), null, 'invalid');
		strictEqual(ImageUtils.getSize(buffer, 'image/webp'), null, 'no size');
		deepEqual(ImageUtils.getSize(webpLossy, 'image/webp'), [256, 256], 'size (lossy)');
		deepEqual(ImageUtils.getSize(webpLossless, 'image/webp'), [256, 256], 'size (lossless)');
		strictEqual(ImageUtils.getChannels(webpLossy, 'image/webp'), 4, 'channels');
		strictEqual(ImageUtils.getChannels(webpLossless, 'image/fake'), null, 'channels (other)');
		strictEqual(ImageUtils.getVRAMByteLength(webpLossy, 'image/webp'), 349524, 'vramSize');
	});
});
