require('source-map-support').install();

import test from 'tape';
import { Document, NodeIO } from '@gltf-transform/core';
import { TextureTransform, Transform } from '../';

const WRITER_OPTIONS = {basename: 'extensionTest'};

const io = new NodeIO().registerExtensions([TextureTransform]);

test('@gltf-transform/extensions::texture-transform', t => {
	const doc = new Document();
	const transformExtension = doc.createExtension(TextureTransform);
	const tex1 = doc.createTexture()
		.setMimeType('image/png')
		.setImage(new ArrayBuffer(10));
	const tex2 = doc.createTexture()
		.setMimeType('image/png')
		.setImage(new ArrayBuffer(15));
	const tex3 = doc.createTexture()
		.setMimeType('image/png')
		.setImage(new ArrayBuffer(20));
	const mat = doc.createMaterial();
	mat.setBaseColorTexture(tex1)
		.getBaseColorTextureInfo()
		.setExtension('KHR_texture_transform', transformExtension.createTransform()
			.setTexCoord(2)
			.setScale([100, 100]));
	mat.setEmissiveTexture(tex2)
		.getEmissiveTextureInfo()
		.setExtension('KHR_texture_transform', transformExtension.createTransform()
			.setTexCoord(1)
			.setOffset([.5, .5])
			.setRotation(Math.PI));
	mat.setOcclusionTexture(tex3);

	// Read (roundtrip) from file.
	const rtDoc = io.readJSON(io.writeJSON(doc, WRITER_OPTIONS));
	const rtMat = rtDoc.getRoot().listMaterials()[0];
	const rtTransform1 = rtMat.getBaseColorTextureInfo()
		.getExtension<Transform>('KHR_texture_transform');
	const rtTransform2 = rtMat.getEmissiveTextureInfo()
		.getExtension<Transform>('KHR_texture_transform');
	const rtTransform3 = rtMat.getOcclusionTextureInfo()
		.getExtension<Transform>('KHR_texture_transform');

	t.ok(rtTransform1, 'baseColorTexture transform');
	t.ok(rtTransform2, 'emissiveColorTexture transform');
	t.notOk(rtTransform3, 'occlusionColorTexture transform');

	t.equal(rtTransform1.getTexCoord(), 2, 'baseColorTexture.texCoord');
	t.deepEqual(rtTransform1.getScale(), [100, 100], 'baseColorTexture.scale');
	t.deepEqual(rtTransform1.getOffset(), [0, 0], 'baseColorTexture.offset');
	t.deepEqual(rtTransform1.getRotation(), 0, 'baseColorTexture.rotation');

	t.equal(rtTransform2.getTexCoord(), 1, 'emissiveColorTexture.texCoord');
	t.deepEqual(rtTransform2.getScale(), [1, 1], 'emissiveColorTexture.scale');
	t.deepEqual(rtTransform2.getOffset(), [.5, .5], 'emissiveColorTexture.offset');
	t.deepEqual(rtTransform2.getRotation(), Math.PI, 'emissiveColorTexture.rotation');

	// Clean up extension data, revert to core glTF.
	transformExtension.dispose();
	t.notOk(
		mat.getBaseColorTextureInfo().getExtension('KHR_texture_transform'),
		'clears baseColorTexture transform'
	);
	t.notOk(
		mat.getEmissiveTextureInfo().getExtension('KHR_texture_transform'),
		'clears emissiveColorTexture transform'
	);

	t.end();
});

test('@gltf-transform/extensions::texture-transform | clone', t => {
	let doc = new Document();
	const transformExtension = doc.createExtension(TextureTransform);
	const tex1 = doc.createTexture();
	const tex2 = doc.createTexture();
	const tex3 = doc.createTexture();

	let mat = doc.createMaterial();
	mat.setBaseColorTexture(tex1)
		.getBaseColorTextureInfo()
		.setExtension('KHR_texture_transform', transformExtension.createTransform()
			.setTexCoord(2)
			.setScale([100, 100]));
	mat.setEmissiveTexture(tex2)
		.getEmissiveTextureInfo()
		.setExtension('KHR_texture_transform', transformExtension.createTransform()
			.setTexCoord(1)
			.setOffset([.5, .5])
			.setRotation(Math.PI));
	mat.setOcclusionTexture(tex3);

	// Clone the Document, and ensure data is intact.
	doc = doc.clone();
	mat = doc.getRoot().listMaterials()[0];
	const transform1 = mat.getBaseColorTextureInfo()
		.getExtension<Transform>('KHR_texture_transform');
	const transform2 = mat.getEmissiveTextureInfo()
		.getExtension<Transform>('KHR_texture_transform');
	const transform3 = mat.getOcclusionTextureInfo()
		.getExtension<Transform>('KHR_texture_transform');

	t.ok(transform1, 'baseColorTexture transform');
	t.ok(transform2, 'emissiveColorTexture transform');
	t.notOk(transform3, 'occlusionColorTexture transform');

	t.equal(transform1.getTexCoord(), 2, 'baseColorTexture.texCoord');
	t.deepEqual(transform1.getScale(), [100, 100], 'baseColorTexture.scale');
	t.deepEqual(transform1.getOffset(), [0, 0], 'baseColorTexture.offset');
	t.deepEqual(transform1.getRotation(), 0, 'baseColorTexture.rotation');

	t.equal(transform2.getTexCoord(), 1, 'emissiveColorTexture.texCoord');
	t.deepEqual(transform2.getScale(), [1, 1], 'emissiveColorTexture.scale');
	t.deepEqual(transform2.getOffset(), [.5, .5], 'emissiveColorTexture.offset');
	t.deepEqual(transform2.getRotation(), Math.PI, 'emissiveColorTexture.rotation');

	t.end();
});


test('@gltf-transform/extensions::texture-transform | i/o', t => {
	const doc = new Document();
	const transformExtension = doc.createExtension(TextureTransform);
	const tex1 = doc.createTexture();

	const mat = doc.createMaterial();
	mat.setBaseColorTexture(tex1)
		.getBaseColorTextureInfo()
		.setExtension('KHR_texture_transform', transformExtension.createTransform()
			.setScale([100, 100]));
	mat.setEmissiveTexture(tex1)
		.getEmissiveTextureInfo()
		.setExtension('KHR_texture_transform', transformExtension.createTransform()
			.setTexCoord(0)
			.setOffset([.5, .5])
			.setRotation(Math.PI));

	const jsonDoc = io.writeJSON(doc, WRITER_OPTIONS);
	const materialDef = jsonDoc.json.materials[0];
	const baseColorTextureInfoDef = materialDef.pbrMetallicRoughness.baseColorTexture;
	const emissiveTextureInfoDef = materialDef.emissiveTexture;

	t.deepEqual(
		baseColorTextureInfoDef.extensions,
		{'KHR_texture_transform': {scale: [100, 100]}}, // omit texCoord!
		'base color texture info'
	);
	t.deepEqual(
		emissiveTextureInfoDef.extensions,
		{'KHR_texture_transform': {texCoord: 0, offset: [.5, .5], rotation: Math.PI}},
		'emissive texture info'
	);
	t.end();
});
