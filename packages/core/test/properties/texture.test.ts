require('source-map-support').install();

import test from 'tape';
import { Document, JSONDocument, NodeIO, TextureInfo } from '../../';

test('@gltf-transform/core::texture | read', t => {
	const jsonDoc = {
		json: {
			asset: {version: '2.0'},
			textures: [
				{source: 0, sampler: 0},
				{source: 1},
				{source: 0},
			],
			samplers: [
				{wrapS: 33071}
			],
			images: [
				{uri: 'tex1.png'},
				{uri: 'tex2.jpeg'},
			],
			materials: [
				{normalTexture: {index: 0}, occlusionTexture: {index: 2}},
				{normalTexture: {index: 1}}
			]
		},
		resources: {
			'tex1.png': new ArrayBuffer(1),
			'tex2.jpeg': new ArrayBuffer(2),
		}
	};

	const io = new NodeIO();
	const doc = io.readJSON(jsonDoc as unknown as JSONDocument);
	const root = doc.getRoot();
	const mat1 = root.listMaterials()[0];
	const mat2 = root.listMaterials()[1];

	t.equals(root.listTextures().length, 2, 'reads two textures');
	t.equals(mat1.getNormalTexture().getURI(), 'tex1.png', 'assigns texture');
	t.equals(mat1.getOcclusionTexture().getURI(), 'tex1.png', 'reuses texture');
	t.equals(mat1.getNormalTextureInfo().getWrapS(), 33071, 'assigns sampler properties');
	t.equals(mat1.getOcclusionTextureInfo().getWrapS(), 10497, 'keeps default sampler properties');
	t.equals(mat2.getNormalTexture().getURI(), 'tex2.jpeg', 'assigns 2nd texture');
	t.equals(root.listTextures()[0].getMimeType(), 'image/png', 'assigns "image/png" MIME type');
	t.equals(root.listTextures()[1].getMimeType(), 'image/jpeg', 'assigns "image/jpeg" MIME type');
	t.end();
});

test('@gltf-transform/core::texture | write', t => {
	const doc = new Document();
	const image1 = new ArrayBuffer(1);
	const image2 = new ArrayBuffer(2);
	const texture1 = doc.createTexture('tex1')
		.setImage(image1)
		.setURI('tex1.png');
	const texture2 = doc.createTexture('tex2')
		.setImage(image2)
		.setMimeType('image/jpeg');
	doc.createMaterial('mat1')
		.setBaseColorTexture(texture1)
		.setNormalTexture(texture2);
	doc.createMaterial('mat2')
		.setBaseColorTexture(texture1)
		.getBaseColorTextureInfo()
		.setWrapS(TextureInfo.WrapMode.CLAMP_TO_EDGE);

	const io = new NodeIO();
	const jsonDoc = io.writeJSON(doc, {basename: 'basename', isGLB: false});

	t.false('basename.bin' in jsonDoc.resources, 'external image resources');
	t.true('tex1.png' in jsonDoc.resources, 'writes tex1.png');
	t.true('basename_1.jpg' in jsonDoc.resources, 'writes default-named jpeg');
	t.equals(jsonDoc.json.images.length, 2, 'reuses images');
	t.equals(jsonDoc.json.textures.length, 3, 'writes three textures');
	t.equals(jsonDoc.json.samplers.length, 2, 'reuses samplers');
	t.end();
});

test('@gltf-transform/core::texture | copy', t => {
	const doc = new Document();
	const tex = doc.createTexture('MyTexture')
		.setImage(new ArrayBuffer(2))
		.setMimeType('image/gif')
		.setURI('path/to/image.gif');

	const tex2 = doc.createTexture().copy(tex);
	t.equals(tex2.getName(), 'MyTexture', 'copy name');
	t.deepEqual(tex2.getImage(), tex.getImage(), 'copy image');
	t.equals(tex2.getMimeType(), 'image/gif', 'copy mimeType');
	t.equals(tex2.getURI(), 'path/to/image.gif', 'copy URI');

	t.end();
});

test('@gltf-transform/core::texture | extras', t => {
	const io = new NodeIO();
	const doc = new Document();
	doc.createTexture('A').setExtras({foo: 1, bar: 2});

	const writerOptions = {isGLB: false, basename: 'test'};
	const doc2 = io.readJSON(io.writeJSON(doc, writerOptions));

	t.deepEqual(doc.getRoot().listTextures()[0].getExtras(), {foo: 1, bar: 2}, 'storage');
	t.deepEqual(doc2.getRoot().listTextures()[0].getExtras(), {foo: 1, bar: 2}, 'roundtrip');

	t.end();
});

test('@gltf-transform/core::texture | padding', t => {
	// Ensure that buffer views are padded to 4-byte boundaries. See:
	// https://github.com/KhronosGroup/glTF/issues/1935

	const doc = new Document();
	doc.createBuffer();
	doc.createTexture().setImage(new ArrayBuffer(17)).setMimeType('image/png');
	doc.createTexture().setImage(new ArrayBuffer(21)).setMimeType('image/png');
	doc.createTexture().setImage(new ArrayBuffer(20)).setMimeType('image/png');

	const jsonDoc = new NodeIO().writeJSON(doc, {isGLB: true, basename: 'test'});

	t.deepEqual(jsonDoc.json.images, [
		{bufferView: 0, mimeType: 'image/png'},
		{bufferView: 1, mimeType: 'image/png'},
		{bufferView: 2, mimeType: 'image/png'},
	], 'images');
	t.deepEqual(jsonDoc.json.bufferViews, [
		{buffer: 0, byteOffset: 0, byteLength: 17},
		{buffer: 0, byteOffset: 20, byteLength: 21},
		{buffer: 0, byteOffset: 44, byteLength: 20},
	], 'bufferViews');
	t.deepEqual(jsonDoc.json.buffers, [
		{byteLength: 64}
	], 'buffers');
	t.end();
});
