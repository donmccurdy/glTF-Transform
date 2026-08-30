import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
	Document,
	Format,
	type Property,
	PropertyType,
	type Texture,
	TextureChannel,
	TextureInfo,
} from '@gltf-transform/core';
import { createPlatformIO } from '@gltf-transform/test-utils';

const { R, G, B, A } = TextureChannel;

describe('core::Material', () => {
	test('properties', () => {
		const document = new Document();

		const mat = document.createMaterial('mat').setDoubleSided(true).setAlphaMode('MASK').setAlphaCutoff(0.33);

		strictEqual(mat.getDoubleSided(), true, 'doubleSided');
		strictEqual(mat.getAlphaMode(), 'MASK', 'alphaMode');
		strictEqual(mat.getAlphaCutoff(), 0.33, 'alphaCutoff');
	});

	test('factors', () => {
		const document = new Document();

		const mat = document
			.createMaterial('mat')
			.setBaseColorFactor([1, 0, 0, 1])
			.setEmissiveFactor([0.5, 0.5, 0.5])
			.setMetallicFactor(0.1)
			.setRoughnessFactor(0.9);

		deepEqual(mat.getBaseColorFactor(), [1, 0, 0, 1], 'baseColorFactor');
		deepEqual(mat.getEmissiveFactor(), [0.5, 0.5, 0.5], 'emissiveFactor');
		strictEqual(mat.getMetallicFactor(), 0.1, 'metallicFactor');
		strictEqual(mat.getRoughnessFactor(), 0.9, 'roughnessFactor');
	});

	test('textures', () => {
		const document = new Document();

		const baseColor = document.createTexture('baseColor');
		const emissive = document.createTexture('emissive');
		const normal = document.createTexture('normal');
		const metalRough = document.createTexture('metalRough');
		const occlusion = document.createTexture('occlusion');

		const mat = document
			.createMaterial('mat')
			.setBaseColorTexture(baseColor)
			.setEmissiveTexture(emissive)
			.setNormalTexture(normal)
			.setNormalScale(0.85)
			.setMetallicRoughnessTexture(metalRough)
			.setOcclusionTexture(occlusion)
			.setOcclusionStrength(0.4);

		strictEqual(mat.getBaseColorTexture(), baseColor, 'baseColorTexture');
		strictEqual(mat.getEmissiveTexture(), emissive, 'emissiveTexture');
		strictEqual(mat.getNormalTexture(), normal, 'normalTexture');
		strictEqual(mat.getNormalScale(), 0.85, 'normalTexture.scale');
		strictEqual(mat.getMetallicRoughnessTexture(), metalRough, 'metallicRoughnessTexture');
		strictEqual(mat.getOcclusionTexture(), occlusion, 'occlusionTexture');
		strictEqual(mat.getOcclusionStrength(), 0.4, 'occlusionTexture.strength');
	});

	test('texture samplers', () => {
		const document = new Document();

		const mat = document.createMaterial('mat');
		const baseColor = document.createTexture('baseColor');
		const emissive = document.createTexture('emissive');

		strictEqual(mat.getBaseColorTextureInfo(), null, 'default baseColorTexture sampler');
		strictEqual(mat.getEmissiveTextureInfo(), null, 'default emissiveTexture sampler');
		strictEqual(mat.getNormalTextureInfo(), null, 'default normalTexture sampler');
		strictEqual(mat.getMetallicRoughnessTextureInfo(), null, 'default metalRoughTexture sampler');
		strictEqual(mat.getOcclusionTextureInfo(), null, 'default occlusionTexture sampler');

		mat.setBaseColorTexture(baseColor)
			.getBaseColorTextureInfo()
			.setWrapS(TextureInfo.WrapMode.REPEAT)
			.setWrapT(TextureInfo.WrapMode.CLAMP_TO_EDGE);

		mat.setEmissiveTexture(emissive)
			.getEmissiveTextureInfo()
			.setMinFilter(TextureInfo.MinFilter.LINEAR)
			.setMagFilter(TextureInfo.MagFilter.NEAREST);

		strictEqual(mat.getBaseColorTextureInfo().getWrapS(), TextureInfo.WrapMode.REPEAT, 'wrapS');
		strictEqual(mat.getBaseColorTextureInfo().getWrapT(), TextureInfo.WrapMode.CLAMP_TO_EDGE, 'wrapT');
		strictEqual(mat.getEmissiveTextureInfo().getMinFilter(), TextureInfo.MinFilter.LINEAR, 'minFilter');
		strictEqual(mat.getEmissiveTextureInfo().getMagFilter(), TextureInfo.MagFilter.NEAREST, 'magFilter');
		strictEqual(mat.getNormalTextureInfo(), null, 'unchanged normalTexture sampler');
		strictEqual(mat.getMetallicRoughnessTextureInfo(), null, 'unchanged metallicRoughnessTexture sampler');
		strictEqual(mat.getOcclusionTextureInfo(), null, 'unchanged occlusionTexture sampler');
	});

	test('texture info', () => {
		const document = new Document();

		const mat = document.createMaterial('mat');
		const baseColor = document.createTexture('baseColor');
		const emissive = document.createTexture('emissive');

		strictEqual(mat.getBaseColorTextureInfo(), null, 'default baseColorTexture info');
		strictEqual(mat.getEmissiveTextureInfo(), null, 'default emissiveTexture info');
		strictEqual(mat.getNormalTextureInfo(), null, 'default normalTexture info');
		strictEqual(mat.getMetallicRoughnessTextureInfo(), null, 'default metallicRoughnessTexture info');
		strictEqual(mat.getOcclusionTextureInfo(), null, 'default occlusionTexture info');

		mat.setBaseColorTexture(baseColor).getBaseColorTextureInfo().setTexCoord(0);

		mat.setEmissiveTexture(emissive).getEmissiveTextureInfo().setTexCoord(1);

		strictEqual(mat.getBaseColorTextureInfo().getTexCoord(), 0, 'baseColorTexture.texCoord');
		strictEqual(mat.getEmissiveTextureInfo().getTexCoord(), 1, 'emissiveTexture.texCoord');
		strictEqual(mat.getNormalTextureInfo(), null, 'unchanged normalTexture info');
		strictEqual(mat.getMetallicRoughnessTextureInfo(), null, 'unchanged metallicRoughnessTexture info');
		strictEqual(mat.getOcclusionTextureInfo(), null, 'unchanged occlusionTexture info');
	});

	test('texture linking', () => {
		const document = new Document();

		const tex1 = document.createTexture('tex1');
		const tex2 = document.createTexture('tex2');
		const tex3 = document.createTexture('tex3');

		const mat = document.createMaterial('mat');

		const toType = (p: Property): string => p.propertyType;

		mat.setBaseColorTexture(tex1);
		strictEqual(mat.getBaseColorTexture(), tex1, 'sets baseColorTexture');
		deepEqual(tex1.listParents().map(toType), ['Root', 'Material'], 'links baseColorTexture');

		mat.setNormalTexture(tex2);
		strictEqual(mat.getNormalTexture(), tex2, 'sets normalTexture');
		deepEqual(tex1.listParents().map(toType), ['Root', 'Material'], 'links normalTexture');
		deepEqual(tex2.listParents().map(toType), ['Root', 'Material'], 'links normalTexture');

		mat.setBaseColorTexture(tex3);
		strictEqual(mat.getBaseColorTexture(), tex3, 'overwrites baseColorTexture');
		deepEqual(tex1.listParents().map(toType), ['Root'], 'unlinks old baseColorTexture');
		deepEqual(tex3.listParents().map(toType), ['Root', 'Material'], 'links new baseColorTexture');

		mat.setBaseColorTexture(null);
		strictEqual(mat.getBaseColorTexture(), null, 'deletes baseColorTexture');
		deepEqual(tex3.listParents().map(toType), ['Root'], 'unlinks old baseColorTexture');
	});

	test('texture info linking', () => {
		const document = new Document();

		const mat = document.createMaterial('mat');
		const tex1 = document.createTexture('tex1');
		const tex2 = document.createTexture('tex2');
		const tex3 = document.createTexture('tex3');

		strictEqual(mat.getBaseColorTextureInfo(), null, 'textureInfo == null');

		mat.setBaseColorTexture(tex1);
		mat.getBaseColorTextureInfo().setTexCoord(2);

		const textureInfo = mat.getBaseColorTextureInfo();
		ok(textureInfo, 'textureInfo != null');
		strictEqual(textureInfo.getTexCoord(), 2, 'textureInfo.texCoord === 2');

		mat.setBaseColorTexture(tex2);
		strictEqual(mat.getBaseColorTextureInfo(), textureInfo, 'textureInfo unchanged');

		mat.setBaseColorTexture(null);
		strictEqual(mat.getBaseColorTextureInfo(), null, 'textureInfo == null');

		mat.setBaseColorTexture(tex3);
		strictEqual(mat.getBaseColorTextureInfo(), textureInfo, 'textureInfo unchanged');

		const baseColorTextureInfo = mat.getBaseColorTextureInfo();
		mat.dispose();
		strictEqual(baseColorTextureInfo.isDisposed(), true, 'textureInfo disposed with material');
	});

	test('texture channels', () => {
		const document = new Document();
		const graph = document.getGraph();

		const baseColorTexture = document.createTexture('baseColorTexture');
		const normalTexture = document.createTexture('normalTexture');
		const occlusionTexture = document.createTexture('occlusionTexture');
		const metallicRoughnessTexture = document.createTexture('metallicRoughnessTexture');

		const mat = document
			.createMaterial('mat')
			.setBaseColorTexture(baseColorTexture)
			.setNormalTexture(normalTexture)
			.setOcclusionTexture(occlusionTexture)
			.setMetallicRoughnessTexture(metallicRoughnessTexture);

		function getChannels(texture: Texture): number {
			let mask = 0x0000;
			for (const edge of graph.listParentEdges(texture)) {
				const { channels } = edge.getAttributes() as { channels: number | undefined };

				if (channels) {
					mask |= channels;
					continue;
				}

				if (edge.getParent().propertyType !== PropertyType.ROOT) {
					throw new Error(`Missing attribute ".channels" on link, "${edge.getName()}".`);
				}
			}
			return mask;
		}

		strictEqual(getChannels(baseColorTexture), R | G | B | A, 'baseColorTexture channels');
		strictEqual(getChannels(normalTexture), R | G | B, 'normalTexture channels');
		strictEqual(getChannels(occlusionTexture), R, 'occlusionTexture channels');
		strictEqual(getChannels(metallicRoughnessTexture), G | B, 'metallicRoughnessTexture channels');

		mat.setMetallicRoughnessTexture(occlusionTexture);

		strictEqual(getChannels(occlusionTexture), R | G | B, 'O/R/M channels');
	});

	test('copy', () => {
		const document = new Document();
		const tex = document.createTexture('MyTex');
		const mat = document
			.createMaterial('MyMat')
			.setAlphaMode('BLEND')
			.setAlphaCutoff(0.5)
			.setBaseColorFactor([1, 0, 1, 0.5])
			.setBaseColorTexture(tex)
			.setMetallicFactor(0)
			.setRoughnessFactor(0.9)
			.setMetallicRoughnessTexture(tex)
			.setNormalScale(0.9)
			.setNormalTexture(tex)
			.setOcclusionStrength(1.5)
			.setOcclusionTexture(tex)
			.setEmissiveFactor([2, 2, 2])
			.setEmissiveTexture(tex);
		mat.getBaseColorTextureInfo()
			.setTexCoord(2)
			.setMagFilter(TextureInfo.MagFilter.LINEAR)
			.setMinFilter(TextureInfo.MinFilter.NEAREST)
			.setWrapS(TextureInfo.WrapMode.REPEAT)
			.setWrapT(TextureInfo.WrapMode.MIRRORED_REPEAT);

		const mat2 = document.createMaterial().copy(mat);

		strictEqual(mat2.getName(), 'MyMat', 'copy name');
		strictEqual(mat2.getAlphaMode(), 'BLEND', 'copy AlphaMode');
		strictEqual(mat2.getAlphaCutoff(), 0.5, 'copy AlphaCutoff');
		deepEqual(mat2.getBaseColorFactor(), [1, 0, 1, 0.5], 'copy BaseColorFactor');
		strictEqual(mat2.getBaseColorTexture(), tex, 'copy BaseColorTexture');
		strictEqual(mat2.getMetallicFactor(), 0, 'copy MetallicFactor');
		strictEqual(mat2.getRoughnessFactor(), 0.9, 'copy RoughnessFactor');
		strictEqual(mat2.getMetallicRoughnessTexture(), tex, 'copy MetallicRoughnessTexture');
		strictEqual(mat2.getNormalScale(), 0.9, 'copy NormalScale');
		strictEqual(mat2.getNormalTexture(), tex, 'copy NormalTexture');
		strictEqual(mat2.getOcclusionStrength(), 1.5, 'copy OcclusionStrength');
		strictEqual(mat2.getOcclusionTexture(), tex, 'copy OcclusionTexture');
		deepEqual(mat2.getEmissiveFactor(), [2, 2, 2], 'copy EmissiveFactor');
		strictEqual(mat2.getEmissiveTexture(), tex, 'copy EmissiveTexture');

		const textureInfo = mat2.getBaseColorTextureInfo();
		strictEqual(textureInfo.getTexCoord(), 2, 'copy texCoord');
		strictEqual(textureInfo.getMagFilter(), TextureInfo.MagFilter.LINEAR, 'magFilter');
		strictEqual(textureInfo.getMinFilter(), TextureInfo.MinFilter.NEAREST, 'minFilter');
		strictEqual(textureInfo.getWrapS(), TextureInfo.WrapMode.REPEAT, 'wrapS');
		strictEqual(textureInfo.getWrapT(), TextureInfo.WrapMode.MIRRORED_REPEAT, 'wrapT');
	});

	test('equals', () => {
		const document = new Document();
		const tex = document.createTexture('MyTex');
		const mat = document
			.createMaterial('MyMat')
			.setAlphaMode('BLEND')
			.setAlphaCutoff(0.5)
			.setBaseColorFactor([1, 0, 1, 0.5])
			.setBaseColorTexture(tex)
			.setMetallicFactor(0)
			.setRoughnessFactor(0.9)
			.setMetallicRoughnessTexture(tex)
			.setNormalScale(0.9)
			.setNormalTexture(tex)
			.setOcclusionStrength(1.5)
			.setOcclusionTexture(tex)
			.setEmissiveFactor([2, 2, 2])
			.setEmissiveTexture(tex);
		mat.getBaseColorTextureInfo()
			.setTexCoord(2)
			.setMagFilter(TextureInfo.MagFilter.LINEAR)
			.setMinFilter(TextureInfo.MinFilter.NEAREST)
			.setWrapS(TextureInfo.WrapMode.REPEAT)
			.setWrapT(TextureInfo.WrapMode.MIRRORED_REPEAT);

		const mat2 = document.createMaterial();

		mat2.copy(mat);
		strictEqual(mat.equals(mat), true, 'mat = mat');
		strictEqual(mat.equals(mat2), true, 'mat ≅ mat2');

		mat2.copy(mat).setAlphaMode('OPAQUE');
		strictEqual(mat.equals(mat2), false, '.alphaMode ≠ .alphaMode');

		mat2.copy(mat).setBaseColorFactor([1, 1, 1, 0]);
		strictEqual(mat.equals(mat2), false, '.baseColorFactor ≠ .baseColorFactor');

		mat2.copy(mat).setBaseColorTexture(tex.clone());
		strictEqual(mat.equals(mat2), true, '.baseColorTexture ≅ .baseColorTexture');

		mat2.copy(mat).setBaseColorTexture(tex.clone().setURI('other.png'));
		strictEqual(mat.equals(mat2), false, '.baseColorTexture ≠ .baseColorTexture');

		mat2.copy(mat).setBaseColorTexture(null);
		strictEqual(mat.equals(mat2), false, '.baseColorTexture ≠ null');

		mat2.copy(mat).getBaseColorTextureInfo().setTexCoord(0);
		strictEqual(mat.equals(mat2), false, '.baseColorTextureInfo ≠ .baseColorTextureInfo');
	});

	test('i/o', async () => {
		const document = new Document();
		document.createBuffer();

		const createTexture = (name: string) =>
			document.createTexture(name).setImage(new Uint8Array(10)).setMimeType('image/png');

		const baseColor = createTexture('baseColor');
		const emissive = createTexture('emissive');
		const normal = createTexture('normal');
		const metalRough = createTexture('metalRough');
		const occlusion = createTexture('occlusion');

		document
			.createMaterial('mat')
			.setBaseColorTexture(baseColor)
			.setEmissiveTexture(emissive)
			.setNormalTexture(normal)
			.setNormalScale(0.85)
			.setMetallicRoughnessTexture(metalRough)
			.setOcclusionTexture(occlusion)
			.setOcclusionStrength(0.4);

		const io = await createPlatformIO();
		const rtDocument = await io.readJSON(await io.writeJSON(document, { format: Format.GLB }));
		const rtMat = rtDocument.getRoot().listMaterials()[0];

		ok(rtMat.getBaseColorTexture(), 'baseColorTexture');
		ok(rtMat.getEmissiveTexture(), 'emissiveTexture');
		ok(rtMat.getNormalTexture(), 'normalTexture');
		strictEqual(rtMat.getNormalScale(), 0.85, 'normalTexture.scale');
		ok(rtMat.getMetallicRoughnessTexture(), 'metallicRoughnessTexture');
		ok(rtMat.getOcclusionTexture(), 'occlusionTexture');
		strictEqual(rtMat.getOcclusionStrength(), 0.4, 'occlusionTexture.strength');
	});
});
