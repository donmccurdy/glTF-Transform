import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, Format, type JSONDocument, TextureInfo } from '@gltf-transform/core';
import { createPlatformIO } from '@gltf-transform/test-utils';

describe('core::Texture', () => {
	test('read', async () => {
		const jsonDoc = {
			json: {
				asset: { version: '2.0' },
				textures: [{ source: 0, sampler: 0 }, { source: 1 }, { source: 0 }],
				samplers: [{ wrapS: 33071 }],
				images: [{ uri: 'tex1.png' }, { uri: 'tex2.jpeg' }],
				materials: [
					{ normalTexture: { index: 0 }, occlusionTexture: { index: 2 } },
					{ normalTexture: { index: 1 } },
				],
			},
			resources: {
				'tex1.png': new Uint8Array(1),
				'tex2.jpeg': new Uint8Array(2),
			},
		};

		const io = await createPlatformIO();
		const document = await io.readJSON(jsonDoc as unknown as JSONDocument);
		const root = document.getRoot();
		const mat1 = root.listMaterials()[0];
		const mat2 = root.listMaterials()[1];

		strictEqual(root.listTextures().length, 2, 'reads two textures');
		strictEqual(mat1.getNormalTexture().getURI(), 'tex1.png', 'assigns texture');
		strictEqual(mat1.getOcclusionTexture().getURI(), 'tex1.png', 'reuses texture');
		strictEqual(mat1.getNormalTextureInfo().getWrapS(), 33071, 'assigns sampler properties');
		strictEqual(mat1.getOcclusionTextureInfo().getWrapS(), 10497, 'keeps default sampler properties');
		strictEqual(mat2.getNormalTexture().getURI(), 'tex2.jpeg', 'assigns 2nd texture');
		strictEqual(root.listTextures()[0].getMimeType(), 'image/png', 'assigns "image/png" MIME type');
		strictEqual(root.listTextures()[1].getMimeType(), 'image/jpeg', 'assigns "image/jpeg" MIME type');
	});

	test('write', async () => {
		const document = new Document();
		document.createBuffer();
		const image1 = new Uint8Array(1);
		const image2 = new Uint8Array(2);
		const image3 = new Uint8Array(3);
		const texture1 = document.createTexture('tex1').setImage(image1).setURI('tex1.png');
		const texture2 = document.createTexture('tex2').setImage(image2).setMimeType('image/jpeg');
		const texture3 = document.createTexture('tex2').setImage(image3).setMimeType('image/jpeg'); // reused name
		document
			.createMaterial('mat1')
			.setBaseColorTexture(texture1)
			.setNormalTexture(texture2)
			.setOcclusionTexture(texture3);
		document
			.createMaterial('mat2')
			.setBaseColorTexture(texture1)
			.getBaseColorTextureInfo()
			.setWrapS(TextureInfo.WrapMode.CLAMP_TO_EDGE);

		const io = await createPlatformIO();
		const jsonDoc = await io.writeJSON(document, { basename: '' });

		strictEqual('basename.bin' in jsonDoc.resources, false, 'external image resources');
		ok('tex1.png' in jsonDoc.resources, 'writes tex1.png');
		ok('normal_1.jpg' in jsonDoc.resources, 'writes default-named normal map');
		ok('occlusion_1.jpg' in jsonDoc.resources, 'writes default-named occlusion map');
		strictEqual(jsonDoc.json.images.length, 3, 'reuses images');
		strictEqual(jsonDoc.json.textures.length, 4, 'writes textures');
		strictEqual(jsonDoc.json.samplers.length, 2, 'reuses samplers');
	});

	test('copy', () => {
		const document = new Document();
		const tex = document
			.createTexture('MyTexture')
			.setImage(new Uint8Array(2))
			.setMimeType('image/gif')
			.setURI('path/to/image.gif');

		const tex2 = document.createTexture().copy(tex);
		strictEqual(tex2.getName(), 'MyTexture', 'copy name');
		deepEqual(tex2.getImage(), tex.getImage(), 'copy image');
		strictEqual(tex2.getMimeType(), 'image/gif', 'copy mimeType');
		strictEqual(tex2.getURI(), 'path/to/image.gif', 'copy URI');
	});

	test('extras', async () => {
		const io = await createPlatformIO();
		const document = new Document();
		document.createBuffer();
		document.createTexture('A').setExtras({ foo: 1, bar: 2 }).setImage(new Uint8Array(10)).setMimeType('image/png');

		const doc2 = await io.readJSON(await io.writeJSON(document));

		deepEqual(document.getRoot().listTextures()[0].getExtras(), { foo: 1, bar: 2 }, 'storage');
		deepEqual(doc2.getRoot().listTextures()[0].getExtras(), { foo: 1, bar: 2 }, 'roundtrip');
	});

	test('textureInfo extras', async () => {
		const io = await createPlatformIO();
		const document = new Document();
		document.createBuffer();
		const texture = document
			.createTexture('A')
			.setExtras({ foo: 1, bar: 2 })
			.setImage(new Uint8Array(10))
			.setMimeType('image/png');
		const material = document.createMaterial().setBaseColorTexture(texture);
		material.getBaseColorTextureInfo()!.setExtras({ textureInfoID: 12345 });
		const doc2 = await io.readJSON(await io.writeJSON(document));
		const rtMaterial = doc2.getRoot().listMaterials()[0];

		deepEqual(material.getBaseColorTextureInfo()!.getExtras(), { textureInfoID: 12345 }, 'storage');
		deepEqual(rtMaterial.getBaseColorTextureInfo()!.getExtras(), { textureInfoID: 12345 }, 'roundtrip');
	});

	test('padding', async () => {
		// Ensure that buffer views are padded to 8-byte boundaries. See:
		// https://github.com/KhronosGroup/glTF/issues/1935

		const document = new Document();
		document.createBuffer();
		document.createTexture().setImage(new Uint8Array(17)).setMimeType('image/png');
		document.createTexture().setImage(new Uint8Array(21)).setMimeType('image/png');
		document.createTexture().setImage(new Uint8Array(20)).setMimeType('image/png');

		const io = await createPlatformIO();
		const jsonDoc = await io.writeJSON(document, { format: Format.GLB });

		deepEqual(
			jsonDoc.json.images,
			[
				{ bufferView: 0, mimeType: 'image/png' },
				{ bufferView: 1, mimeType: 'image/png' },
				{ bufferView: 2, mimeType: 'image/png' },
			],
			'images',
		);
		deepEqual(
			jsonDoc.json.bufferViews,
			[
				{ buffer: 0, byteOffset: 0, byteLength: 17 },
				{ buffer: 0, byteOffset: 24, byteLength: 21 },
				{ buffer: 0, byteOffset: 48, byteLength: 20 },
			],
			'bufferViews',
		);
		deepEqual(jsonDoc.json.buffers, [{ byteLength: 72 }], 'buffers');
	});
});
