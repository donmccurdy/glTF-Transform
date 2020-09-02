require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');
const { Document, NodeIO, TextureInfo } = require('../../');

test('@gltf-transform/core::texture | read', t => {
	const nativeDoc = {
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

	const io = new NodeIO(fs, path);
	const doc = io.createDocument(nativeDoc);
	const root = doc.getRoot();
	const mat1 = root.listMaterials()[0];
	const mat2 = root.listMaterials()[1];

	t.equals(root.listTextures().length, 2, 'reads two textures');
	t.equals(mat1.getNormalTexture().getURI(), 'tex1.png', 'assigns texture');
	t.equals(mat1.getOcclusionTexture().getURI(), 'tex1.png', 'reuses texture');
	t.equals(mat1.getNormalTextureSampler().getWrapS(), 33071, 'assigns sampler properties');
	t.equals(mat1.getOcclusionTextureSampler().getWrapS(), 10497, 'keeps default sampler properties');
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
		.getBaseColorTextureSampler()
		.setWrapS(TextureInfo.CLAMP_TO_EDGE);

	const io = new NodeIO(fs, path);
	const nativeDoc = io.createNativeDocument(doc, {basename: 'basename', isGLB: false});

	t.false('basename.bin' in nativeDoc.resources, 'external image resources');
	t.true('tex1.png' in nativeDoc.resources, 'writes tex1.png');
	t.true('basename_1.jpg' in nativeDoc.resources, 'writes default-named jpeg');
	t.equals(nativeDoc.json.images.length, 2, 'reuses images');
	t.equals(nativeDoc.json.textures.length, 3, 'writes three textures');
	t.equals(nativeDoc.json.samplers.length, 2, 'reuses samplers');
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
	const io = new NodeIO(fs, path);
	const doc = new Document();
	doc.createTexture('A').setExtras({foo: 1, bar: 2});

	const writerOptions = {isGLB: false, basename: 'test'};
	const doc2 = io.createDocument(io.createNativeDocument(doc, writerOptions));

	t.deepEqual(doc.getRoot().listTextures()[0].getExtras(), {foo: 1, bar: 2}, 'stores extras');
	t.deepEqual(doc2.getRoot().listTextures()[0].getExtras(), {foo: 1, bar: 2}, 'roundtrips extras');

	t.end();
});
