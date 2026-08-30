import { deepEqual, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, type GLTF, ImageUtils, type JSONDocument, NodeIO } from '@gltf-transform/core';
import { EXTTextureAVIF } from '@gltf-transform/extensions';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const WRITER_OPTIONS = { basename: 'extensionTest' };

const io = new NodeIO().registerExtensions([EXTTextureAVIF]);
const __dirname = dirname(fileURLToPath(import.meta.url));

describe('extensions::EXTTextureAVIF', () => {
	test('basic', async () => {
		const doc = new Document();
		doc.createBuffer();
		const avifExtension = doc.createExtension(EXTTextureAVIF);
		const tex1 = doc.createTexture('AVIFTexture').setMimeType('image/avif').setImage(new Uint8Array(10));
		const tex2 = doc.createTexture('PNGTexture').setMimeType('image/png').setImage(new Uint8Array(15));
		doc.createMaterial().setBaseColorTexture(tex1).setEmissiveTexture(tex2);

		let jsonDoc: JSONDocument;

		jsonDoc = await io.writeJSON(doc, WRITER_OPTIONS);

		// Writing to file.
		deepEqual(jsonDoc.json.extensionsUsed, ['EXT_texture_avif'], 'writes extensionsUsed');
		strictEqual(jsonDoc.json.textures[0].source, undefined, 'omits .source on AVIF texture');
		strictEqual(jsonDoc.json.textures[1].source, 1, 'includes .source on PNG texture');
		strictEqual(
			(jsonDoc.json.textures[0].extensions['EXT_texture_avif'] as GLTF.ITexture).source,
			0,
			'includes .source on AVIF extension',
		);

		// Read (roundtrip) from file.
		const rtDoc = await io.readJSON(jsonDoc);
		const rtRoot = rtDoc.getRoot();
		strictEqual(rtRoot.listTextures()[0].getMimeType(), 'image/avif', 'reads AVIF mimetype');
		strictEqual(rtRoot.listTextures()[1].getMimeType(), 'image/png', 'reads PNG mimetype');
		strictEqual(rtRoot.listTextures()[0].getImage().byteLength, 10, 'reads AVIF payload');
		strictEqual(rtRoot.listTextures()[1].getImage().byteLength, 15, 'reads PNG payload');

		// Clean up extension data, revert to core glTF.
		avifExtension.dispose();
		tex1.dispose();
		jsonDoc = await io.writeJSON(doc, WRITER_OPTIONS);
		strictEqual(jsonDoc.json.extensionsUsed, undefined, 'clears extensionsUsed');
		strictEqual(jsonDoc.json.textures.length, 1, 'writes only 1 texture');
		strictEqual(jsonDoc.json.textures[0].source, 0, 'includes .source on PNG texture');
	});

	test('image-utils', () => {
		const avif = fs.readFileSync(path.join(__dirname, 'in', 'test.avif'));
		const buffer = new Uint8Array([0, 1, 2, 3]);

		strictEqual(ImageUtils.getSize(new Uint8Array(8), 'image/avif'), null, 'invalid');
		strictEqual(ImageUtils.getSize(buffer, 'image/avif'), null, 'no size');
		deepEqual(ImageUtils.getSize(avif, 'image/avif'), [256, 256], 'size');
		strictEqual(ImageUtils.getChannels(avif, 'image/avif'), 4, 'channels');
		strictEqual(ImageUtils.getVRAMByteLength(avif, 'image/avif'), 349524, 'vramSize');
	});
});
