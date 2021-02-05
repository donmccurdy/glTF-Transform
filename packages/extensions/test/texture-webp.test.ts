require('source-map-support').install();

import test from 'tape';
import { Document, NodeIO } from '@gltf-transform/core';
import { TextureWebP } from '../';

const WRITER_OPTIONS = {basename: 'extensionTest'};

const io = new NodeIO().registerExtensions([TextureWebP]);

test('@gltf-transform/extensions::texture-webp', t => {
	const doc = new Document();
	const webpExtension = doc.createExtension(TextureWebP);
	const tex1 = doc.createTexture('WebPTexture')
		.setMimeType('image/webp')
		.setImage(new ArrayBuffer(10));
	const tex2 = doc.createTexture('PNGTexture')
		.setMimeType('image/png')
		.setImage(new ArrayBuffer(15));
	doc.createMaterial().setBaseColorTexture(tex1).setEmissiveTexture(tex2);

	let jsonDoc;

	jsonDoc = io.writeJSON(doc, WRITER_OPTIONS);

	// Writing to file.
	t.deepEqual(jsonDoc.json.extensionsUsed, ['EXT_texture_webp'], 'writes extensionsUsed');
	t.equal(jsonDoc.json.textures[0].source, undefined, 'omits .source on WebP texture');
	t.equal(jsonDoc.json.textures[1].source, 1, 'includes .source on PNG texture');
	t.equal(
		jsonDoc.json.textures[0].extensions['EXT_texture_webp'].source,
		0,
		'includes .source on WebP extension'
	);

	// Read (roundtrip) from file.
	const rtDoc = io.readJSON(jsonDoc);
	const rtRoot = rtDoc.getRoot();
	t.equal(rtRoot.listTextures()[0].getMimeType(), 'image/webp', 'reads WebP mimetype');
	t.equal(rtRoot.listTextures()[1].getMimeType(), 'image/png', 'reads PNG mimetype');
	t.equal(rtRoot.listTextures()[0].getImage().byteLength, 10, 'reads WebP payload');
	t.equal(rtRoot.listTextures()[1].getImage().byteLength, 15, 'reads PNG payload');

	// Clean up extension data, revert to core glTF.
	webpExtension.dispose();
	tex1.dispose();
	jsonDoc = io.writeJSON(doc, WRITER_OPTIONS);
	t.equal(jsonDoc.json.extensionsUsed, undefined, 'clears extensionsUsed');
	t.equal(jsonDoc.json.textures.length, 1, 'writes only 1 texture');
	t.equal(jsonDoc.json.textures[0].source, 0, 'includes .source on PNG texture');
	t.end();
});
