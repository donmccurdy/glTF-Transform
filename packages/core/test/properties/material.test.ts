import test from 'ava';
import { Document, Format, Property, PropertyType, Texture, TextureChannel, TextureInfo } from '@gltf-transform/core';
import { createPlatformIO } from '@gltf-transform/test-utils';

const { R, G, B, A } = TextureChannel;

test('properties', (t) => {
	const document = new Document();

	const mat = document.createMaterial('mat').setDoubleSided(true).setAlphaMode('MASK').setAlphaCutoff(0.33);

	t.is(mat.getDoubleSided(), true, 'doubleSided');
	t.is(mat.getAlphaMode(), 'MASK', 'alphaMode');
	t.is(mat.getAlphaCutoff(), 0.33, 'alphaCutoff');
});

test('factors', (t) => {
	const document = new Document();

	const mat = document
		.createMaterial('mat')
		.setBaseColorFactor([1, 0, 0, 1])
		.setEmissiveFactor([0.5, 0.5, 0.5])
		.setMetallicFactor(0.1)
		.setRoughnessFactor(0.9);

	t.deepEqual(mat.getBaseColorFactor(), [1, 0, 0, 1], 'baseColorFactor');
	t.deepEqual(mat.getEmissiveFactor(), [0.5, 0.5, 0.5], 'emissiveFactor');
	t.is(mat.getMetallicFactor(), 0.1, 'metallicFactor');
	t.is(mat.getRoughnessFactor(), 0.9, 'roughnessFactor');
});

test('hex', (t) => {
	const document = new Document();

	const mat = document.createMaterial('mat').setAlpha(0.9).setBaseColorHex(0x00ff00);

	t.is(mat.getAlpha(), 0.9, 'alpha');
	t.is(mat.getBaseColorHex(), 65024, 'baseColorHex');
});

test('textures', (t) => {
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

	t.is(mat.getBaseColorTexture(), baseColor, 'baseColorTexture');
	t.is(mat.getEmissiveTexture(), emissive, 'emissiveTexture');
	t.is(mat.getNormalTexture(), normal, 'normalTexture');
	t.is(mat.getNormalScale(), 0.85, 'normalTexture.scale');
	t.is(mat.getMetallicRoughnessTexture(), metalRough, 'metallicRoughnessTexture');
	t.is(mat.getOcclusionTexture(), occlusion, 'occlusionTexture');
	t.is(mat.getOcclusionStrength(), 0.4, 'occlusionTexture.strength');
});

test('texture samplers', (t) => {
	const document = new Document();

	const mat = document.createMaterial('mat');
	const baseColor = document.createTexture('baseColor');
	const emissive = document.createTexture('emissive');

	t.is(mat.getBaseColorTextureInfo(), null, 'default baseColorTexture sampler');
	t.is(mat.getEmissiveTextureInfo(), null, 'default emissiveTexture sampler');
	t.is(mat.getNormalTextureInfo(), null, 'default normalTexture sampler');
	t.is(mat.getMetallicRoughnessTextureInfo(), null, 'default metalRoughTexture sampler');
	t.is(mat.getOcclusionTextureInfo(), null, 'default occlusionTexture sampler');

	mat.setBaseColorTexture(baseColor)
		.getBaseColorTextureInfo()
		.setWrapS(TextureInfo.WrapMode.REPEAT)
		.setWrapT(TextureInfo.WrapMode.CLAMP_TO_EDGE);

	mat.setEmissiveTexture(emissive)
		.getEmissiveTextureInfo()
		.setMinFilter(TextureInfo.MinFilter.LINEAR)
		.setMagFilter(TextureInfo.MagFilter.NEAREST);

	t.is(mat.getBaseColorTextureInfo().getWrapS(), TextureInfo.WrapMode.REPEAT, 'wrapS');
	t.is(mat.getBaseColorTextureInfo().getWrapT(), TextureInfo.WrapMode.CLAMP_TO_EDGE, 'wrapT');
	t.is(mat.getEmissiveTextureInfo().getMinFilter(), TextureInfo.MinFilter.LINEAR, 'minFilter');
	t.is(mat.getEmissiveTextureInfo().getMagFilter(), TextureInfo.MagFilter.NEAREST, 'magFilter');
	t.is(mat.getNormalTextureInfo(), null, 'unchanged normalTexture sampler');
	t.is(mat.getMetallicRoughnessTextureInfo(), null, 'unchanged metallicRoughnessTexture sampler');
	t.is(mat.getOcclusionTextureInfo(), null, 'unchanged occlusionTexture sampler');
});

test('texture info', (t) => {
	const document = new Document();

	const mat = document.createMaterial('mat');
	const baseColor = document.createTexture('baseColor');
	const emissive = document.createTexture('emissive');

	t.is(mat.getBaseColorTextureInfo(), null, 'default baseColorTexture info');
	t.is(mat.getEmissiveTextureInfo(), null, 'default emissiveTexture info');
	t.is(mat.getNormalTextureInfo(), null, 'default normalTexture info');
	t.is(mat.getMetallicRoughnessTextureInfo(), null, 'default metallicRoughnessTexture info');
	t.is(mat.getOcclusionTextureInfo(), null, 'default occlusionTexture info');

	mat.setBaseColorTexture(baseColor).getBaseColorTextureInfo().setTexCoord(0);

	mat.setEmissiveTexture(emissive).getEmissiveTextureInfo().setTexCoord(1);

	t.is(mat.getBaseColorTextureInfo().getTexCoord(), 0, 'baseColorTexture.texCoord');
	t.is(mat.getEmissiveTextureInfo().getTexCoord(), 1, 'emissiveTexture.texCoord');
	t.is(mat.getNormalTextureInfo(), null, 'unchanged normalTexture info');
	t.is(mat.getMetallicRoughnessTextureInfo(), null, 'unchanged metallicRoughnessTexture info');
	t.is(mat.getOcclusionTextureInfo(), null, 'unchanged occlusionTexture info');
});

test('texture linking', (t) => {
	const document = new Document();

	const tex1 = document.createTexture('tex1');
	const tex2 = document.createTexture('tex2');
	const tex3 = document.createTexture('tex3');

	const mat = document.createMaterial('mat');

	const toType = (p: Property): string => p.propertyType;

	mat.setBaseColorTexture(tex1);
	t.is(mat.getBaseColorTexture(), tex1, 'sets baseColorTexture');
	t.deepEqual(tex1.listParents().map(toType), ['Root', 'Material'], 'links baseColorTexture');

	mat.setNormalTexture(tex2);
	t.is(mat.getNormalTexture(), tex2, 'sets normalTexture');
	t.deepEqual(tex1.listParents().map(toType), ['Root', 'Material'], 'links normalTexture');
	t.deepEqual(tex2.listParents().map(toType), ['Root', 'Material'], 'links normalTexture');

	mat.setBaseColorTexture(tex3);
	t.is(mat.getBaseColorTexture(), tex3, 'overwrites baseColorTexture');
	t.deepEqual(tex1.listParents().map(toType), ['Root'], 'unlinks old baseColorTexture');
	t.deepEqual(tex3.listParents().map(toType), ['Root', 'Material'], 'links new baseColorTexture');

	mat.setBaseColorTexture(null);
	t.is(mat.getBaseColorTexture(), null, 'deletes baseColorTexture');
	t.deepEqual(tex3.listParents().map(toType), ['Root'], 'unlinks old baseColorTexture');
});

test('texture info linking', (t) => {
	const document = new Document();

	const mat = document.createMaterial('mat');
	const tex1 = document.createTexture('tex1');
	const tex2 = document.createTexture('tex2');
	const tex3 = document.createTexture('tex3');

	t.is(mat.getBaseColorTextureInfo(), null, 'textureInfo == null');

	mat.setBaseColorTexture(tex1);
	mat.getBaseColorTextureInfo().setTexCoord(2);

	const textureInfo = mat.getBaseColorTextureInfo();
	t.truthy(textureInfo, 'textureInfo != null');
	t.is(textureInfo.getTexCoord(), 2, 'textureInfo.texCoord === 2');

	mat.setBaseColorTexture(tex2);
	t.is(mat.getBaseColorTextureInfo(), textureInfo, 'textureInfo unchanged');

	mat.setBaseColorTexture(null);
	t.is(mat.getBaseColorTextureInfo(), null, 'textureInfo == null');

	mat.setBaseColorTexture(tex3);
	t.is(mat.getBaseColorTextureInfo(), textureInfo, 'textureInfo unchanged');

	const baseColorTextureInfo = mat.getBaseColorTextureInfo();
	mat.dispose();
	t.is(baseColorTextureInfo.isDisposed(), true, 'textureInfo disposed with material');
});

test('texture channels', (t) => {
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

	t.is(getChannels(baseColorTexture), R | G | B | A, 'baseColorTexture channels');
	t.is(getChannels(normalTexture), R | G | B, 'normalTexture channels');
	t.is(getChannels(occlusionTexture), R, 'occlusionTexture channels');
	t.is(getChannels(metallicRoughnessTexture), G | B, 'metallicRoughnessTexture channels');

	mat.setMetallicRoughnessTexture(occlusionTexture);

	t.is(getChannels(occlusionTexture), R | G | B, 'O/R/M channels');
});

test('copy', (t) => {
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

	t.is(mat2.getName(), 'MyMat', 'copy name');
	t.is(mat2.getAlphaMode(), 'BLEND', 'copy AlphaMode');
	t.is(mat2.getAlphaCutoff(), 0.5, 'copy AlphaCutoff');
	t.deepEqual(mat2.getBaseColorFactor(), [1, 0, 1, 0.5], 'copy BaseColorFactor');
	t.is(mat2.getBaseColorTexture(), tex, 'copy BaseColorTexture');
	t.is(mat2.getMetallicFactor(), 0, 'copy MetallicFactor');
	t.is(mat2.getRoughnessFactor(), 0.9, 'copy RoughnessFactor');
	t.is(mat2.getMetallicRoughnessTexture(), tex, 'copy MetallicRoughnessTexture');
	t.is(mat2.getNormalScale(), 0.9, 'copy NormalScale');
	t.is(mat2.getNormalTexture(), tex, 'copy NormalTexture');
	t.is(mat2.getOcclusionStrength(), 1.5, 'copy OcclusionStrength');
	t.is(mat2.getOcclusionTexture(), tex, 'copy OcclusionTexture');
	t.deepEqual(mat2.getEmissiveFactor(), [2, 2, 2], 'copy EmissiveFactor');
	t.is(mat2.getEmissiveTexture(), tex, 'copy EmissiveTexture');

	const textureInfo = mat2.getBaseColorTextureInfo();
	t.is(textureInfo.getTexCoord(), 2, 'copy texCoord');
	t.is(textureInfo.getMagFilter(), TextureInfo.MagFilter.LINEAR, 'magFilter');
	t.is(textureInfo.getMinFilter(), TextureInfo.MinFilter.NEAREST, 'minFilter');
	t.is(textureInfo.getWrapS(), TextureInfo.WrapMode.REPEAT, 'wrapS');
	t.is(textureInfo.getWrapT(), TextureInfo.WrapMode.MIRRORED_REPEAT, 'wrapT');
});

test('equals', (t) => {
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
	t.is(mat.equals(mat), true, 'mat = mat');
	t.is(mat.equals(mat2), true, 'mat ≅ mat2');

	mat2.copy(mat).setAlphaMode('OPAQUE');
	t.is(mat.equals(mat2), false, '.alphaMode ≠ .alphaMode');

	mat2.copy(mat).setBaseColorFactor([1, 1, 1, 0]);
	t.is(mat.equals(mat2), false, '.baseColorFactor ≠ .baseColorFactor');

	mat2.copy(mat).setBaseColorTexture(tex.clone());
	t.is(mat.equals(mat2), true, '.baseColorTexture ≅ .baseColorTexture');

	mat2.copy(mat).setBaseColorTexture(tex.clone().setURI('other.png'));
	t.is(mat.equals(mat2), false, '.baseColorTexture ≠ .baseColorTexture');

	mat2.copy(mat).setBaseColorTexture(null);
	t.is(mat.equals(mat2), false, '.baseColorTexture ≠ null');

	mat2.copy(mat).getBaseColorTextureInfo().setTexCoord(0);
	t.is(mat.equals(mat2), false, '.baseColorTextureInfo ≠ .baseColorTextureInfo');
});

test('i/o', async (t) => {
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

	t.truthy(rtMat.getBaseColorTexture(), 'baseColorTexture');
	t.truthy(rtMat.getEmissiveTexture(), 'emissiveTexture');
	t.truthy(rtMat.getNormalTexture(), 'normalTexture');
	t.is(rtMat.getNormalScale(), 0.85, 'normalTexture.scale');
	t.truthy(rtMat.getMetallicRoughnessTexture(), 'metallicRoughnessTexture');
	t.truthy(rtMat.getOcclusionTexture(), 'occlusionTexture');
	t.is(rtMat.getOcclusionStrength(), 0.4, 'occlusionTexture.strength');
});
