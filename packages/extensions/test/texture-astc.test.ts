import { deepEqual, strictEqual } from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import { Document, type GLTF, ImageUtils, type JSONDocument, NodeIO } from '@gltf-transform/core';
import { EXTTextureASTC, KHRTextureBasisu } from '@gltf-transform/extensions';

const WRITER_OPTIONS = { basename: 'extensionTest' };

const readFixture = (name: string): Uint8Array => fs.readFileSync(path.resolve(import.meta.dirname, 'in', name));

describe('extensions::EXTTextureASTC', () => {
	test('basic', async () => {
		const io = new NodeIO().registerExtensions([EXTTextureASTC]);
		const doc = new Document();
		doc.createBuffer();
		const astcExtension = doc.createExtension(EXTTextureASTC);
		const astc = readFixture('2d_astc4x4.ktx2');
		const tex1 = doc.createTexture('ASTCTexture').setMimeType('image/ktx2').setImage(astc);
		const tex2 = doc.createTexture('PNGTexture').setMimeType('image/png').setImage(new Uint8Array(15));
		doc.createMaterial().setBaseColorTexture(tex1).setEmissiveTexture(tex2);

		let jsonDoc: JSONDocument;

		jsonDoc = await io.writeJSON(doc, WRITER_OPTIONS);

		// Writing to file.
		deepEqual(jsonDoc.json.extensionsUsed, [EXTTextureASTC.EXTENSION_NAME], 'writes extensionsUsed');
		strictEqual(jsonDoc.json.textures[0].source, undefined, 'omits .source on ASTC texture');
		strictEqual(jsonDoc.json.textures[1].source, 1, 'includes .source on PNG texture');
		strictEqual(
			(jsonDoc.json.textures[0].extensions['EXT_texture_astc'] as GLTF.ITexture).source,
			0,
			'includes .source on ASTC extension',
		);

		// Read (roundtrip) from file.
		const rtDoc = await io.readJSON(jsonDoc);
		const rtRoot = rtDoc.getRoot();
		strictEqual(rtRoot.listTextures()[0].getMimeType(), 'image/ktx2', 'reads KTX2 mimetype');
		strictEqual(rtRoot.listTextures()[1].getMimeType(), 'image/png', 'reads PNG mimetype');
		strictEqual(rtRoot.listTextures()[0].getImage().byteLength, astc.byteLength, 'reads ASTC payload');
		strictEqual(rtRoot.listTextures()[1].getImage().byteLength, 15, 'reads PNG payload');

		// Clean up extension data, revert to core glTF.
		astcExtension.dispose();
		tex1.dispose();
		jsonDoc = await io.writeJSON(doc, WRITER_OPTIONS);
		strictEqual(jsonDoc.json.extensionsUsed, undefined, 'clears extensionsUsed');
		strictEqual(jsonDoc.json.textures.length, 1, 'writes only 1 texture');
		strictEqual(jsonDoc.json.textures[0].source, 0, 'includes .source on PNG texture');
	});

	test('mixed with KHR_texture_basisu', async () => {
		const io = new NodeIO().registerExtensions([EXTTextureASTC, KHRTextureBasisu]);
		const doc = new Document();
		doc.createBuffer();
		doc.createExtension(EXTTextureASTC).setRequired(true);
		doc.createExtension(KHRTextureBasisu).setRequired(true);
		const texASTC = doc.createTexture('ASTC').setMimeType('image/ktx2').setImage(readFixture('2d_astc4x4.ktx2'));
		const texUASTC = doc.createTexture('UASTC').setMimeType('image/ktx2').setImage(readFixture('2d_uastc.ktx2'));
		const texETC1S = doc.createTexture('ETC1S').setMimeType('image/ktx2').setImage(readFixture('2d_etc1s.ktx2'));
		doc.createMaterial().setBaseColorTexture(texASTC).setEmissiveTexture(texUASTC).setOcclusionTexture(texETC1S);

		const jsonDoc = await io.writeJSON(doc, WRITER_OPTIONS);
		const [astcDef, uastcDef, etc1sDef] = jsonDoc.json.textures;

		deepEqual(
			[...jsonDoc.json.extensionsUsed].sort(),
			['EXT_texture_astc', 'KHR_texture_basisu'],
			'writes extensionsUsed',
		);
		deepEqual(Object.keys(astcDef.extensions), ['EXT_texture_astc'], 'ASTC → EXT_texture_astc');
		deepEqual(Object.keys(uastcDef.extensions), ['KHR_texture_basisu'], 'UASTC → KHR_texture_basisu');
		deepEqual(Object.keys(etc1sDef.extensions), ['KHR_texture_basisu'], 'ETC1S → KHR_texture_basisu');

		// Read (roundtrip) from file.
		const rtDoc = await io.readJSON(jsonDoc);
		const rtTextures = rtDoc.getRoot().listTextures();
		deepEqual(
			rtTextures.map((texture) => texture.getImage().byteLength),
			[texASTC, texUASTC, texETC1S].map((texture) => texture.getImage().byteLength),
			'reads KTX2 payloads',
		);
	});

	test('image-utils | astc4x4', () => {
		// EXTTextureASTC registers KTX2 support on its own, without KHRTextureBasisu.
		EXTTextureASTC.register();
		const ktx2 = readFixture('2d_astc4x4.ktx2');

		strictEqual(ImageUtils.getMimeType(ktx2), 'image/ktx2', 'mimeType');
		deepEqual(ImageUtils.getSize(ktx2, 'image/ktx2'), [40, 40], 'size');
		strictEqual(ImageUtils.getVRAMByteLength(ktx2, 'image/ktx2'), 2240, 'gpuSize');
	});
});
