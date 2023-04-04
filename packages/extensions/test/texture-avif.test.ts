import test from 'ava';
import { Document, GLTF, ImageUtils, JSONDocument, NodeIO } from '@gltf-transform/core';
import { EXTTextureAVIF } from '@gltf-transform/extensions';
import path, { dirname } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const WRITER_OPTIONS = { basename: 'extensionTest' };

const io = new NodeIO().registerExtensions([EXTTextureAVIF]);
const __dirname = dirname(fileURLToPath(import.meta.url));

test('basic', async (t) => {
	const doc = new Document();
	doc.createBuffer();
	const avifExtension = doc.createExtension(EXTTextureAVIF);
	const tex1 = doc.createTexture('AVIFTexture').setMimeType('image/avif').setImage(new Uint8Array(10));
	const tex2 = doc.createTexture('PNGTexture').setMimeType('image/png').setImage(new Uint8Array(15));
	doc.createMaterial().setBaseColorTexture(tex1).setEmissiveTexture(tex2);

	let jsonDoc: JSONDocument;

	jsonDoc = await io.writeJSON(doc, WRITER_OPTIONS);

	// Writing to file.
	t.deepEqual(jsonDoc.json.extensionsUsed, ['EXT_texture_avif'], 'writes extensionsUsed');
	t.is(jsonDoc.json.textures[0].source, undefined, 'omits .source on AVIF texture');
	t.is(jsonDoc.json.textures[1].source, 1, 'includes .source on PNG texture');
	t.is(
		(jsonDoc.json.textures[0].extensions['EXT_texture_avif'] as GLTF.ITexture).source,
		0,
		'includes .source on AVIF extension'
	);

	// Read (roundtrip) from file.
	const rtDoc = await io.readJSON(jsonDoc);
	const rtRoot = rtDoc.getRoot();
	t.is(rtRoot.listTextures()[0].getMimeType(), 'image/avif', 'reads AVIF mimetype');
	t.is(rtRoot.listTextures()[1].getMimeType(), 'image/png', 'reads PNG mimetype');
	t.is(rtRoot.listTextures()[0].getImage().byteLength, 10, 'reads AVIF payload');
	t.is(rtRoot.listTextures()[1].getImage().byteLength, 15, 'reads PNG payload');

	// Clean up extension data, revert to core glTF.
	avifExtension.dispose();
	tex1.dispose();
	jsonDoc = await io.writeJSON(doc, WRITER_OPTIONS);
	t.is(jsonDoc.json.extensionsUsed, undefined, 'clears extensionsUsed');
	t.is(jsonDoc.json.textures.length, 1, 'writes only 1 texture');
	t.is(jsonDoc.json.textures[0].source, 0, 'includes .source on PNG texture');
});

test('image-utils', (t) => {
	const avif = fs.readFileSync(path.join(__dirname, 'in', 'test.avif'));
	const buffer = new Uint8Array([0, 1, 2, 3]);

	t.is(ImageUtils.getSize(new Uint8Array(8), 'image/avif'), null, 'invalid');
	t.is(ImageUtils.getSize(buffer, 'image/avif'), null, 'no size');
	t.deepEqual(ImageUtils.getSize(avif, 'image/avif'), [256, 256], 'size');
	t.is(ImageUtils.getChannels(avif, 'image/avif'), 4, 'channels');
	t.is(ImageUtils.getVRAMByteLength(avif, 'image/avif'), 349524, 'vramSize');
});
