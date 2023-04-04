import test from 'ava';
import { BufferUtils, Document, GLTF, ImageUtils, JSONDocument, NodeIO } from '@gltf-transform/core';
import { EXTTextureWebP } from '@gltf-transform/extensions';
import path, { dirname } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const WRITER_OPTIONS = { basename: 'extensionTest' };

const io = new NodeIO().registerExtensions([EXTTextureWebP]);
const __dirname = dirname(fileURLToPath(import.meta.url));

test('basic', async (t) => {
	const doc = new Document();
	doc.createBuffer();
	const webpExtension = doc.createExtension(EXTTextureWebP);
	const tex1 = doc.createTexture('WebPTexture').setMimeType('image/webp').setImage(new Uint8Array(10));
	const tex2 = doc.createTexture('PNGTexture').setMimeType('image/png').setImage(new Uint8Array(15));
	doc.createMaterial().setBaseColorTexture(tex1).setEmissiveTexture(tex2);

	let jsonDoc: JSONDocument;

	jsonDoc = await io.writeJSON(doc, WRITER_OPTIONS);

	// Writing to file.
	t.deepEqual(jsonDoc.json.extensionsUsed, ['EXT_texture_webp'], 'writes extensionsUsed');
	t.is(jsonDoc.json.textures[0].source, undefined, 'omits .source on WebP texture');
	t.is(jsonDoc.json.textures[1].source, 1, 'includes .source on PNG texture');
	t.is(
		(jsonDoc.json.textures[0].extensions['EXT_texture_webp'] as GLTF.ITexture).source,
		0,
		'includes .source on WebP extension'
	);

	// Read (roundtrip) from file.
	const rtDoc = await io.readJSON(jsonDoc);
	const rtRoot = rtDoc.getRoot();
	t.is(rtRoot.listTextures()[0].getMimeType(), 'image/webp', 'reads WebP mimetype');
	t.is(rtRoot.listTextures()[1].getMimeType(), 'image/png', 'reads PNG mimetype');
	t.is(rtRoot.listTextures()[0].getImage().byteLength, 10, 'reads WebP payload');
	t.is(rtRoot.listTextures()[1].getImage().byteLength, 15, 'reads PNG payload');

	// Clean up extension data, revert to core glTF.
	webpExtension.dispose();
	tex1.dispose();
	jsonDoc = await io.writeJSON(doc, WRITER_OPTIONS);
	t.is(jsonDoc.json.extensionsUsed, undefined, 'clears extensionsUsed');
	t.is(jsonDoc.json.textures.length, 1, 'writes only 1 texture');
	t.is(jsonDoc.json.textures[0].source, 0, 'includes .source on PNG texture');
});

test('image-utils', (t) => {
	const webpLossy = fs.readFileSync(path.join(__dirname, 'in', 'test-lossy.webp'));
	const webpLossless = fs.readFileSync(path.join(__dirname, 'in', 'test-lossless.webp'));
	const buffer = BufferUtils.concat([
		BufferUtils.encodeText('RIFF'),
		new Uint8Array(4),
		BufferUtils.encodeText('WEBP'),
		BufferUtils.encodeText('OTHR'),
		new Uint8Array([999, 0, 0, 0]),
	]);

	t.is(ImageUtils.getSize(new Uint8Array(8), 'image/webp'), null, 'invalid');
	t.is(ImageUtils.getSize(buffer, 'image/webp'), null, 'no size');
	t.deepEqual(ImageUtils.getSize(webpLossy, 'image/webp'), [256, 256], 'size (lossy)');
	t.deepEqual(ImageUtils.getSize(webpLossless, 'image/webp'), [256, 256], 'size (lossless)');
	t.is(ImageUtils.getChannels(webpLossy, 'image/webp'), 4, 'channels');
	t.is(ImageUtils.getChannels(webpLossless, 'image/fake'), null, 'channels (other)');
	t.is(ImageUtils.getVRAMByteLength(webpLossy, 'image/webp'), 349524, 'vramSize');
});
