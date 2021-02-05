require('source-map-support').install();

import test from 'tape';
import { Document, NodeIO } from '@gltf-transform/core';
import { TextureBasisu } from '../';

const WRITER_OPTIONS = {basename: 'extensionTest'};

const io = new NodeIO().registerExtensions([TextureBasisu]);

test('@gltf-transform/extensions::texture-basisu', t => {
	const doc = new Document();
	const basisuExtension = doc.createExtension(TextureBasisu);
	const tex1 = doc.createTexture('BasisTexture')
		.setMimeType('image/ktx2')
		.setImage(new ArrayBuffer(10));
	const tex2 = doc.createTexture('PNGTexture')
		.setMimeType('image/png')
		.setImage(new ArrayBuffer(15));
	doc.createMaterial().setBaseColorTexture(tex1).setEmissiveTexture(tex2);

	let jsonDoc;

	jsonDoc = io.writeJSON(doc, WRITER_OPTIONS);

	// Writing to file.
	t.deepEqual(
		jsonDoc.json.extensionsUsed,
		[TextureBasisu.EXTENSION_NAME],
		'writes extensionsUsed'
	);
	t.equal(jsonDoc.json.textures[0].source, undefined, 'omits .source on KTX2 texture');
	t.equal(jsonDoc.json.textures[1].source, 1, 'includes .source on PNG texture');
	t.equal(
		jsonDoc.json.textures[0].extensions['KHR_texture_basisu'].source,
		0,
		'includes .source on KTX2 extension'
	);

	// Read (roundtrip) from file.
	const rtDoc = io.readJSON(jsonDoc);
	const rtRoot = rtDoc.getRoot();
	t.equal(rtRoot.listTextures()[0].getMimeType(), 'image/ktx2', 'reads KTX2 mimetype');
	t.equal(rtRoot.listTextures()[1].getMimeType(), 'image/png', 'reads PNG mimetype');
	t.equal(rtRoot.listTextures()[0].getImage().byteLength, 10, 'reads KTX2 payload');
	t.equal(rtRoot.listTextures()[1].getImage().byteLength, 15, 'reads PNG payload');

	// Clean up extension data, revert to core glTF.
	basisuExtension.dispose();
	tex1.dispose();
	jsonDoc = io.writeJSON(doc, WRITER_OPTIONS);
	t.equal(jsonDoc.json.extensionsUsed, undefined, 'clears extensionsUsed');
	t.equal(jsonDoc.json.textures.length, 1, 'writes only 1 texture');
	t.equal(jsonDoc.json.textures[0].source, 0, 'includes .source on PNG texture');
	t.end();
});
