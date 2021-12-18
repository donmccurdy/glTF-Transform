require('source-map-support').install();

import test from 'tape';
import { BufferUtils, Document, GLTF, ImageUtils, JSONDocument, NodeIO } from '@gltf-transform/core';
import { TextureWebP } from '../';

const IS_NODEJS = typeof window === 'undefined';

let fs, path;
if (IS_NODEJS) {
	fs = require('fs');
	path = require('path');
}

const WRITER_OPTIONS = { basename: 'extensionTest' };

const io = new NodeIO().registerExtensions([TextureWebP]);

test('@gltf-transform/extensions::texture-webp', async (t) => {
	const doc = new Document();
	doc.createBuffer();
	const webpExtension = doc.createExtension(TextureWebP);
	const tex1 = doc.createTexture('WebPTexture').setMimeType('image/webp').setImage(new Uint8Array(10));
	const tex2 = doc.createTexture('PNGTexture').setMimeType('image/png').setImage(new Uint8Array(15));
	doc.createMaterial().setBaseColorTexture(tex1).setEmissiveTexture(tex2);

	let jsonDoc: JSONDocument;

	jsonDoc = await io.writeJSON(doc, WRITER_OPTIONS);

	// Writing to file.
	t.deepEqual(jsonDoc.json.extensionsUsed, ['EXT_texture_webp'], 'writes extensionsUsed');
	t.equal(jsonDoc.json.textures[0].source, undefined, 'omits .source on WebP texture');
	t.equal(jsonDoc.json.textures[1].source, 1, 'includes .source on PNG texture');
	t.equal(
		(jsonDoc.json.textures[0].extensions['EXT_texture_webp'] as GLTF.ITexture).source,
		0,
		'includes .source on WebP extension'
	);

	// Read (roundtrip) from file.
	const rtDoc = await io.readJSON(jsonDoc);
	const rtRoot = rtDoc.getRoot();
	t.equal(rtRoot.listTextures()[0].getMimeType(), 'image/webp', 'reads WebP mimetype');
	t.equal(rtRoot.listTextures()[1].getMimeType(), 'image/png', 'reads PNG mimetype');
	t.equal(rtRoot.listTextures()[0].getImage().byteLength, 10, 'reads WebP payload');
	t.equal(rtRoot.listTextures()[1].getImage().byteLength, 15, 'reads PNG payload');

	// Clean up extension data, revert to core glTF.
	webpExtension.dispose();
	tex1.dispose();
	jsonDoc = await io.writeJSON(doc, WRITER_OPTIONS);
	t.equal(jsonDoc.json.extensionsUsed, undefined, 'clears extensionsUsed');
	t.equal(jsonDoc.json.textures.length, 1, 'writes only 1 texture');
	t.equal(jsonDoc.json.textures[0].source, 0, 'includes .source on PNG texture');
	t.end();
});

test('@gltf-transform/core::image-utils | webp', { skip: !IS_NODEJS }, (t) => {
	const webpLossy = fs.readFileSync(path.join(__dirname, 'in', 'test-lossy.webp'));
	const webpLossless = fs.readFileSync(path.join(__dirname, 'in', 'test-lossless.webp'));
	const buffer = BufferUtils.concat([
		BufferUtils.encodeText('RIFF'),
		new Uint8Array(4),
		BufferUtils.encodeText('WEBP'),
		BufferUtils.encodeText('OTHR'),
		new Uint8Array([999, 0, 0, 0]),
	]);

	t.equals(ImageUtils.getSize(new Uint8Array(8), 'image/webp'), null, 'invalid');
	t.equals(ImageUtils.getSize(buffer, 'image/webp'), null, 'no size');
	t.deepEquals(ImageUtils.getSize(webpLossy, 'image/webp'), [256, 256], 'size (lossy)');
	t.deepEquals(ImageUtils.getSize(webpLossless, 'image/webp'), [256, 256], 'size (lossless)');
	t.equals(ImageUtils.getChannels(webpLossy, 'image/webp'), 4, 'channels');
	t.equals(ImageUtils.getChannels(webpLossless, 'image/fake'), null, 'channels (other)');
	t.equals(ImageUtils.getMemSize(webpLossy, 'image/webp'), 349524, 'gpuSize');
	t.end();
});
