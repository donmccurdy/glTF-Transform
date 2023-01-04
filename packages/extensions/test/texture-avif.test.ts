require('source-map-support').install();

import test from 'tape';
import { BufferUtils, Document, GLTF, ImageUtils, JSONDocument, NodeIO } from '@gltf-transform/core';
import { TextureAVIF } from '../dist/extensions';

const IS_NODEJS = typeof window === 'undefined';

let fs, path;
if (IS_NODEJS) {
	fs = require('fs');
	path = require('path');
}

const WRITER_OPTIONS = { basename: 'extensionTest' };

const io = new NodeIO().registerExtensions([TextureAVIF]);

test('@gltf-transform/extensions::texture-avif', async (t) => {
	const doc = new Document();
	doc.createBuffer();
	const avifExtension = doc.createExtension(TextureAVIF);
	const tex1 = doc.createTexture('AVIFTexture').setMimeType('image/avif').setImage(new Uint8Array(10));
	const tex2 = doc.createTexture('PNGTexture').setMimeType('image/png').setImage(new Uint8Array(15));
	doc.createMaterial().setBaseColorTexture(tex1).setEmissiveTexture(tex2);

	let jsonDoc: JSONDocument;

	jsonDoc = await io.writeJSON(doc, WRITER_OPTIONS);

	// Writing to file.
	t.deepEqual(jsonDoc.json.extensionsUsed, ['EXT_texture_avif'], 'writes extensionsUsed');
	t.equal(jsonDoc.json.textures[0].source, undefined, 'omits .source on AVIF texture');
	t.equal(jsonDoc.json.textures[1].source, 1, 'includes .source on PNG texture');
	t.equal(
		(jsonDoc.json.textures[0].extensions['EXT_texture_avif'] as GLTF.ITexture).source,
		0,
		'includes .source on AVIF extension'
	);

	// Read (roundtrip) from file.
	const rtDoc = await io.readJSON(jsonDoc);
	const rtRoot = rtDoc.getRoot();
	t.equal(rtRoot.listTextures()[0].getMimeType(), 'image/avif', 'reads AVIF mimetype');
	t.equal(rtRoot.listTextures()[1].getMimeType(), 'image/png', 'reads PNG mimetype');
	t.equal(rtRoot.listTextures()[0].getImage().byteLength, 10, 'reads AVIF payload');
	t.equal(rtRoot.listTextures()[1].getImage().byteLength, 15, 'reads PNG payload');

	// Clean up extension data, revert to core glTF.
	avifExtension.dispose();
	tex1.dispose();
	jsonDoc = await io.writeJSON(doc, WRITER_OPTIONS);
	t.equal(jsonDoc.json.extensionsUsed, undefined, 'clears extensionsUsed');
	t.equal(jsonDoc.json.textures.length, 1, 'writes only 1 texture');
	t.equal(jsonDoc.json.textures[0].source, 0, 'includes .source on PNG texture');
	t.end();
});

test.skip('@gltf-transform/core::image-utils | avif', { skip: !IS_NODEJS }, (t) => {
	// const avif = fs.readFileSync(path.join(__dirname, 'in', 'test-lossy.avif'));
	const buffer = new Uint8Array([0, 1, 2, 3]);

	t.equals(ImageUtils.getSize(new Uint8Array(8), 'image/avif'), null, 'invalid');
	t.equals(ImageUtils.getSize(buffer, 'image/avif'), null, 'no size');
	// TODO
	// t.deepEquals(ImageUtils.getSize(avif, 'image/avif'), [256, 256], 'size (lossy)');
	// t.equals(ImageUtils.getChannels(avif, 'image/avif'), 4, 'channels');
	// t.equals(ImageUtils.getMemSize(avif, 'image/avif'), 349524, 'gpuSize');
	t.end();
});
