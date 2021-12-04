require('source-map-support').install();

import test from 'tape';
import { Document, Format, NodeIO, Property, Texture, TextureChannel, TextureInfo } from '../../';

const { R, G, B, A } = TextureChannel;

test('@gltf-transform/core::material | properties', (t) => {
	const doc = new Document();

	const mat = doc.createMaterial('mat').setDoubleSided(true).setAlphaMode('MASK').setAlphaCutoff(0.33);

	t.equal(mat.getDoubleSided(), true, 'doubleSided');
	t.equal(mat.getAlphaMode(), 'MASK', 'alphaMode');
	t.equal(mat.getAlphaCutoff(), 0.33, 'alphaCutoff');
	t.end();
});

test('@gltf-transform/core::material | factors', (t) => {
	const doc = new Document();

	const mat = doc
		.createMaterial('mat')
		.setBaseColorFactor([1, 0, 0, 1])
		.setEmissiveFactor([0.5, 0.5, 0.5])
		.setMetallicFactor(0.1)
		.setRoughnessFactor(0.9);

	t.deepEqual(mat.getBaseColorFactor(), [1, 0, 0, 1], 'baseColorFactor');
	t.deepEqual(mat.getEmissiveFactor(), [0.5, 0.5, 0.5], 'emissiveFactor');
	t.equal(mat.getMetallicFactor(), 0.1, 'metallicFactor');
	t.equal(mat.getRoughnessFactor(), 0.9, 'roughnessFactor');
	t.end();
});

test('@gltf-transform/core::material | hex', (t) => {
	const doc = new Document();

	const mat = doc.createMaterial('mat').setAlpha(0.9).setBaseColorHex(0x00ff00);

	t.equal(mat.getAlpha(), 0.9, 'alpha');
	t.equal(mat.getBaseColorHex(), 65024, 'baseColorHex');
	t.end();
});

test('@gltf-transform/core::material | textures', (t) => {
	const doc = new Document();

	const baseColor = doc.createTexture('baseColor');
	const emissive = doc.createTexture('emissive');
	const normal = doc.createTexture('normal');
	const metalRough = doc.createTexture('metalRough');
	const occlusion = doc.createTexture('occlusion');

	const mat = doc
		.createMaterial('mat')
		.setBaseColorTexture(baseColor)
		.setEmissiveTexture(emissive)
		.setNormalTexture(normal)
		.setNormalScale(0.85)
		.setMetallicRoughnessTexture(metalRough)
		.setOcclusionTexture(occlusion)
		.setOcclusionStrength(0.4);

	t.equal(mat.getBaseColorTexture(), baseColor, 'baseColorTexture');
	t.equal(mat.getEmissiveTexture(), emissive, 'emissiveTexture');
	t.equal(mat.getNormalTexture(), normal, 'normalTexture');
	t.equal(mat.getNormalScale(), 0.85, 'normalTexture.scale');
	t.equal(mat.getMetallicRoughnessTexture(), metalRough, 'metallicRoughnessTexture');
	t.equal(mat.getOcclusionTexture(), occlusion, 'occlusionTexture');
	t.equal(mat.getOcclusionStrength(), 0.4, 'occlusionTexture.strength');
	t.end();
});

test('@gltf-transform/core::material | texture samplers', (t) => {
	const doc = new Document();

	const mat = doc.createMaterial('mat');
	const baseColor = doc.createTexture('baseColor');
	const emissive = doc.createTexture('emissive');

	t.equal(mat.getBaseColorTextureInfo(), null, 'default baseColorTexture sampler');
	t.equal(mat.getEmissiveTextureInfo(), null, 'default emissiveTexture sampler');
	t.equal(mat.getNormalTextureInfo(), null, 'default normalTexture sampler');
	t.equal(mat.getMetallicRoughnessTextureInfo(), null, 'default metalRoughTexture sampler');
	t.equal(mat.getOcclusionTextureInfo(), null, 'default occlusionTexture sampler');

	mat.setBaseColorTexture(baseColor)
		.getBaseColorTextureInfo()
		.setWrapS(TextureInfo.WrapMode.REPEAT)
		.setWrapT(TextureInfo.WrapMode.CLAMP_TO_EDGE);

	mat.setEmissiveTexture(emissive)
		.getEmissiveTextureInfo()
		.setMinFilter(TextureInfo.MinFilter.LINEAR)
		.setMagFilter(TextureInfo.MagFilter.NEAREST);

	t.equal(mat.getBaseColorTextureInfo().getWrapS(), TextureInfo.WrapMode.REPEAT, 'wrapS');
	t.equal(mat.getBaseColorTextureInfo().getWrapT(), TextureInfo.WrapMode.CLAMP_TO_EDGE, 'wrapT');
	t.equal(mat.getEmissiveTextureInfo().getMinFilter(), TextureInfo.MinFilter.LINEAR, 'minFilter');
	t.equal(mat.getEmissiveTextureInfo().getMagFilter(), TextureInfo.MinFilter.NEAREST, 'magFilter');
	t.equal(mat.getNormalTextureInfo(), null, 'unchanged normalTexture sampler');
	t.equal(mat.getMetallicRoughnessTextureInfo(), null, 'unchanged metallicRoughnessTexture sampler');
	t.equal(mat.getOcclusionTextureInfo(), null, 'unchanged occlusionTexture sampler');
	t.end();
});

test('@gltf-transform/core::material | texture info', (t) => {
	const doc = new Document();

	const mat = doc.createMaterial('mat');
	const baseColor = doc.createTexture('baseColor');
	const emissive = doc.createTexture('emissive');

	t.equal(mat.getBaseColorTextureInfo(), null, 'default baseColorTexture info');
	t.equal(mat.getEmissiveTextureInfo(), null, 'default emissiveTexture info');
	t.equal(mat.getNormalTextureInfo(), null, 'default normalTexture info');
	t.equal(mat.getMetallicRoughnessTextureInfo(), null, 'default metallicRoughnessTexture info');
	t.equal(mat.getOcclusionTextureInfo(), null, 'default occlusionTexture info');

	mat.setBaseColorTexture(baseColor).getBaseColorTextureInfo().setTexCoord(0);

	mat.setEmissiveTexture(emissive).getEmissiveTextureInfo().setTexCoord(1);

	t.equal(mat.getBaseColorTextureInfo().getTexCoord(), 0, 'baseColorTexture.texCoord');
	t.equal(mat.getEmissiveTextureInfo().getTexCoord(), 1, 'emissiveTexture.texCoord');
	t.equal(mat.getNormalTextureInfo(), null, 'unchanged normalTexture info');
	t.equal(mat.getMetallicRoughnessTextureInfo(), null, 'unchanged metallicRoughnessTexture info');
	t.equal(mat.getOcclusionTextureInfo(), null, 'unchanged occlusionTexture info');
	t.end();
});

test('@gltf-transform/core::material | texture linking', (t) => {
	const doc = new Document();

	const tex1 = doc.createTexture('tex1');
	const tex2 = doc.createTexture('tex2');
	const tex3 = doc.createTexture('tex3');

	const mat = doc.createMaterial('mat');

	const toType = (p: Property): string => p.propertyType;

	mat.setBaseColorTexture(tex1);
	t.equals(mat.getBaseColorTexture(), tex1, 'sets baseColorTexture');
	t.deepEqual(tex1.listParents().map(toType), ['Root', 'Material'], 'links baseColorTexture');

	mat.setNormalTexture(tex2);
	t.equals(mat.getNormalTexture(), tex2, 'sets normalTexture');
	t.deepEqual(tex1.listParents().map(toType), ['Root', 'Material'], 'links normalTexture');
	t.deepEqual(tex2.listParents().map(toType), ['Root', 'Material'], 'links normalTexture');

	mat.setBaseColorTexture(tex3);
	t.equals(mat.getBaseColorTexture(), tex3, 'overwrites baseColorTexture');
	t.deepEqual(tex1.listParents().map(toType), ['Root'], 'unlinks old baseColorTexture');
	t.deepEqual(tex3.listParents().map(toType), ['Root', 'Material'], 'links new baseColorTexture');

	mat.setBaseColorTexture(null);
	t.equals(mat.getBaseColorTexture(), null, 'deletes baseColorTexture');
	t.deepEqual(tex3.listParents().map(toType), ['Root'], 'unlinks old baseColorTexture');

	t.end();
});

test('@gltf-transform/core::material | texture info linking', (t) => {
	const doc = new Document();

	const mat = doc.createMaterial('mat');
	const tex1 = doc.createTexture('tex1');
	const tex2 = doc.createTexture('tex2');
	const tex3 = doc.createTexture('tex3');

	t.equals(mat.getBaseColorTextureInfo(), null, 'textureInfo == null');

	mat.setBaseColorTexture(tex1);
	mat.getBaseColorTextureInfo().setTexCoord(2);

	const textureInfo = mat.getBaseColorTextureInfo();
	t.ok(textureInfo, 'textureInfo != null');
	t.equals(textureInfo.getTexCoord(), 2, 'textureInfo.texCoord === 2');

	mat.setBaseColorTexture(tex2);
	t.equals(mat.getBaseColorTextureInfo(), textureInfo, 'textureInfo unchanged');

	mat.setBaseColorTexture(null);
	t.equals(mat.getBaseColorTextureInfo(), null, 'textureInfo == null');

	mat.setBaseColorTexture(tex3);
	t.equals(mat.getBaseColorTextureInfo(), textureInfo, 'textureInfo unchanged');

	const baseColorTextureInfo = mat.getBaseColorTextureInfo();
	mat.dispose();
	t.equals(baseColorTextureInfo.isDisposed(), true, 'textureInfo disposed with material');

	t.end();
});

test('@gltf-transform/core::material | texture channels', (t) => {
	const doc = new Document();
	const graph = doc.getGraph();

	const baseColorTexture = doc.createTexture('baseColorTexture');
	const normalTexture = doc.createTexture('normalTexture');
	const occlusionTexture = doc.createTexture('occlusionTexture');
	const metallicRoughnessTexture = doc.createTexture('metallicRoughnessTexture');

	const mat = doc
		.createMaterial('mat')
		.setBaseColorTexture(baseColorTexture)
		.setNormalTexture(normalTexture)
		.setOcclusionTexture(occlusionTexture)
		.setMetallicRoughnessTexture(metallicRoughnessTexture);

	function getChannels(texture: Texture): number {
		let mask = 0x0000;
		for (const link of graph.listParentLinks(texture)) {
			// TODO(cleanup): Better type information for link metadata.
			const { channels } = link.getAttributes() as { channels: number | undefined };
			if (channels) mask |= channels;
		}
		return mask;
	}

	t.equals(getChannels(baseColorTexture), R | G | B | A, 'baseColorTexture channels');
	t.equals(getChannels(normalTexture), R | G | B, 'normalTexture channels');
	t.equals(getChannels(occlusionTexture), R, 'occlusionTexture channels');
	t.equals(getChannels(metallicRoughnessTexture), G | B, 'metallicRoughnessTexture channels');

	mat.setMetallicRoughnessTexture(occlusionTexture);

	t.equals(getChannels(occlusionTexture), R | G | B, 'O/R/M channels');
	t.end();
});

test('@gltf-transform/core::material | copy', (t) => {
	const doc = new Document();
	const tex = doc.createTexture('MyTex');
	const mat = doc
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

	const mat2 = doc.createMaterial().copy(mat);

	t.equal(mat2.getName(), 'MyMat', 'copy name');
	t.equal(mat2.getAlphaMode(), 'BLEND', 'copy AlphaMode');
	t.equal(mat2.getAlphaCutoff(), 0.5, 'copy AlphaCutoff');
	t.deepEqual(mat2.getBaseColorFactor(), [1, 0, 1, 0.5], 'copy BaseColorFactor');
	t.equal(mat2.getBaseColorTexture(), tex, 'copy BaseColorTexture');
	t.equal(mat2.getMetallicFactor(), 0, 'copy MetallicFactor');
	t.equal(mat2.getRoughnessFactor(), 0.9, 'copy RoughnessFactor');
	t.equal(mat2.getMetallicRoughnessTexture(), tex, 'copy MetallicRoughnessTexture');
	t.equal(mat2.getNormalScale(), 0.9, 'copy NormalScale');
	t.equal(mat2.getNormalTexture(), tex, 'copy NormalTexture');
	t.equal(mat2.getOcclusionStrength(), 1.5, 'copy OcclusionStrength');
	t.equal(mat2.getOcclusionTexture(), tex, 'copy OcclusionTexture');
	t.deepEqual(mat2.getEmissiveFactor(), [2, 2, 2], 'copy EmissiveFactor');
	t.equal(mat2.getEmissiveTexture(), tex, 'copy EmissiveTexture');

	const textureInfo = mat2.getBaseColorTextureInfo();
	t.equal(textureInfo.getTexCoord(), 2, 'copy texCoord');
	t.equal(textureInfo.getMagFilter(), TextureInfo.MagFilter.LINEAR, 'magFilter');
	t.equal(textureInfo.getMinFilter(), TextureInfo.MinFilter.NEAREST, 'minFilter');
	t.equal(textureInfo.getWrapS(), TextureInfo.WrapMode.REPEAT, 'wrapS');
	t.equal(textureInfo.getWrapT(), TextureInfo.WrapMode.MIRRORED_REPEAT, 'wrapT');

	t.end();
});

test('@gltf-transform/core::material | equals', (t) => {
	const doc = new Document();
	const tex = doc.createTexture('MyTex');
	const mat = doc
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

	const mat2 = doc.createMaterial().copy(mat);

	const tex2 = doc.createTexture('NewTex');
	const mat3 = doc
		.createMaterial()
		.copy(mat)
		.setAlphaMode('OPAQUE')
		.setAlphaCutoff(0)
		.setBaseColorFactor([1, 1, 1, 0])
		.setBaseColorTexture(tex2)
		.setMetallicFactor(1)
		.setRoughnessFactor(0.3)
		.setMetallicRoughnessTexture(tex2)
		.setNormalScale(0.1)
		.setNormalTexture(tex2)
		.setOcclusionStrength(0.5)
		.setOcclusionTexture(tex2)
		.setEmissiveFactor([2, 1, 2])
		.setEmissiveTexture(tex2);
	mat3.getBaseColorTextureInfo()
		.setTexCoord(0)
		.setMagFilter(TextureInfo.MagFilter.NEAREST)
		.setMinFilter(TextureInfo.MinFilter.NEAREST)
		.setWrapS(TextureInfo.WrapMode.REPEAT)
		.setWrapT(TextureInfo.WrapMode.REPEAT);

	t.equal(mat.equals(mat2), true, 'Copy Equality');
	t.equal(mat.equals(mat), true, 'Self Equality');
	t.equal(mat.equals(mat3), false, 'Copy Inequality');

	t.end();
});

test('@gltf-transform/core::material | i/o', (t) => {
	const doc = new Document();
	doc.createBuffer();

	const createTexture = (name: string) =>
		doc.createTexture(name).setImage(new ArrayBuffer(10)).setMimeType('image/png');

	const baseColor = createTexture('baseColor');
	const emissive = createTexture('emissive');
	const normal = createTexture('normal');
	const metalRough = createTexture('metalRough');
	const occlusion = createTexture('occlusion');

	doc.createMaterial('mat')
		.setBaseColorTexture(baseColor)
		.setEmissiveTexture(emissive)
		.setNormalTexture(normal)
		.setNormalScale(0.85)
		.setMetallicRoughnessTexture(metalRough)
		.setOcclusionTexture(occlusion)
		.setOcclusionStrength(0.4);

	const io = new NodeIO();
	const rtDoc = io.readJSON(io.writeJSON(doc, { format: Format.GLB }));
	const rtMat = rtDoc.getRoot().listMaterials()[0];

	t.ok(rtMat.getBaseColorTexture(), 'baseColorTexture');
	t.ok(rtMat.getEmissiveTexture(), 'emissiveTexture');
	t.ok(rtMat.getNormalTexture(), 'normalTexture');
	t.equals(rtMat.getNormalScale(), 0.85, 'normalTexture.scale');
	t.ok(rtMat.getMetallicRoughnessTexture(), 'metallicRoughnessTexture');
	t.ok(rtMat.getOcclusionTexture(), 'occlusionTexture');
	t.equals(rtMat.getOcclusionStrength(), 0.4, 'occlusionTexture.strength');
	t.end();
});
