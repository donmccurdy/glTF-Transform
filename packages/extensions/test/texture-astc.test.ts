import { deepEqual, strictEqual } from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import { Document, type GLTF, ImageUtils, type JSONDocument, NodeIO } from '@gltf-transform/core';
import { EXTTextureASTC, KHRTextureBasisu } from '@gltf-transform/extensions';
import { createDefaultContainer, VK_FORMAT_ASTC_4x4_SFLOAT_BLOCK_EXT, write as writeKTX } from 'ktx-parse';

const WRITER_OPTIONS = { basename: 'extensionTest' };

const readFixture = (name: string): Uint8Array => fs.readFileSync(path.resolve(import.meta.dirname, 'in', name));

/** Creates a minimal Basis UASTC HDR (4x4 ASTC SFLOAT, DFD color model 0xa7) KTX2 payload. */
function createUASTCHDR(): Uint8Array {
	const container = createDefaultContainer();
	container.vkFormat = VK_FORMAT_ASTC_4x4_SFLOAT_BLOCK_EXT;
	container.pixelWidth = 4;
	container.pixelHeight = 4;
	container.dataFormatDescriptor[0].colorModel = 0xa7;
	container.levels = [{ levelData: new Uint8Array(16), uncompressedByteLength: 16 }];
	return writeKTX(container);
}

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
		const texHDR = doc.createTexture('UASTC_HDR').setMimeType('image/ktx2').setImage(createUASTCHDR());
		doc.createMaterial()
			.setBaseColorTexture(texASTC)
			.setEmissiveTexture(texUASTC)
			.setOcclusionTexture(texETC1S)
			.setMetallicRoughnessTexture(texHDR);

		const jsonDoc = await io.writeJSON(doc, WRITER_OPTIONS);
		const [astcDef, uastcDef, etc1sDef, hdrDef] = jsonDoc.json.textures;

		deepEqual(
			[...jsonDoc.json.extensionsUsed].sort(),
			['EXT_texture_astc', 'KHR_texture_basisu'],
			'writes extensionsUsed',
		);
		deepEqual(Object.keys(astcDef.extensions), ['EXT_texture_astc'], 'ASTC → EXT_texture_astc');
		deepEqual(Object.keys(uastcDef.extensions), ['KHR_texture_basisu'], 'UASTC → KHR_texture_basisu');
		deepEqual(Object.keys(etc1sDef.extensions), ['KHR_texture_basisu'], 'ETC1S → KHR_texture_basisu');
		strictEqual(hdrDef.extensions, undefined, 'UASTC HDR → no extension');
		strictEqual(typeof hdrDef.source, 'number', 'UASTC HDR keeps .source');

		// Read (roundtrip) from file.
		const rtDoc = await io.readJSON(jsonDoc);
		const rtTextures = rtDoc.getRoot().listTextures();
		deepEqual(
			rtTextures.map((texture) => texture.getImage().byteLength),
			[texASTC, texUASTC, texETC1S, texHDR].map((texture) => texture.getImage().byteLength),
			'reads KTX2 payloads',
		);
	});

	test('skips non-ASTC KTX2', async () => {
		const io = new NodeIO().registerExtensions([EXTTextureASTC]);
		const doc = new Document();
		doc.createBuffer();
		doc.createExtension(EXTTextureASTC);
		const texBC7 = doc.createTexture('BC7').setMimeType('image/ktx2').setImage(readFixture('2d_bc7.ktx2'));
		const texInvalid = doc.createTexture('Invalid').setMimeType('image/ktx2').setImage(new Uint8Array(10));
		doc.createMaterial().setBaseColorTexture(texBC7).setEmissiveTexture(texInvalid);

		const jsonDoc = await io.writeJSON(doc, WRITER_OPTIONS);
		const [bc7Def, invalidDef] = jsonDoc.json.textures;

		for (const [name, def] of [
			['BC7', bc7Def],
			['Invalid', invalidDef],
		] as const) {
			strictEqual(def.extensions, undefined, `${name} → no extension`);
			strictEqual(typeof def.source, 'number', `${name} keeps .source`);
		}
	});

	test('image-utils | astc4x4', () => {
		// EXTTextureASTC registers KTX2 support on its own, without KHRTextureBasisu.
		EXTTextureASTC.register();
		const ktx2 = readFixture('2d_astc4x4.ktx2');

		strictEqual(ImageUtils.getMimeType(ktx2), 'image/ktx2', 'mimeType');
		deepEqual(ImageUtils.getSize(ktx2, 'image/ktx2'), [40, 40], 'size');
		strictEqual(ImageUtils.getChannels(ktx2, 'image/ktx2'), 4, 'channels');
		strictEqual(ImageUtils.getVRAMByteLength(ktx2, 'image/ktx2'), 2240, 'gpuSize');
	});

	test('image-utils | uastc hdr', () => {
		EXTTextureASTC.register();
		const ktx2 = createUASTCHDR();

		strictEqual(ImageUtils.getChannels(ktx2, 'image/ktx2'), 3, 'channels');
		strictEqual(ImageUtils.getVRAMByteLength(ktx2, 'image/ktx2'), 16, 'gpuSize');
	});
});
