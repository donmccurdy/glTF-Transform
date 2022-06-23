require('source-map-support').install();

import test from 'tape';
import { Document, NodeIO } from '@gltf-transform/core';
import { TextureTransform, Transform } from '../';

const WRITER_OPTIONS = { basename: 'extensionTest' };

const io = new NodeIO().registerExtensions([TextureTransform]);

test('@gltf-transform/extensions::texture-transform', async (t) => {
	const doc = new Document();
	doc.createBuffer();
	const transformExtension = doc.createExtension(TextureTransform);
	const tex1 = doc.createTexture().setMimeType('image/png').setImage(new Uint8Array(10));
	const tex2 = doc.createTexture().setMimeType('image/png').setImage(new Uint8Array(15));
	const tex3 = doc.createTexture().setMimeType('image/png').setImage(new Uint8Array(20));
	const mat = doc.createMaterial();
	mat.setBaseColorTexture(tex1)
		.getBaseColorTextureInfo()
		.setExtension(
			'KHR_texture_transform',
			transformExtension.createTransform().setTexCoord(2).setScale([100, 100])
		);
	mat.setEmissiveTexture(tex2)
		.getEmissiveTextureInfo()
		.setExtension(
			'KHR_texture_transform',
			transformExtension.createTransform().setTexCoord(1).setOffset([0.5, 0.5]).setRotation(Math.PI)
		);
	mat.setOcclusionTexture(tex3);

	// Read (roundtrip) from file.
	const rtDoc = await io.readJSON(await io.writeJSON(doc, WRITER_OPTIONS));
	const rtMat = rtDoc.getRoot().listMaterials()[0];
	const rtTransform1 = rtMat.getBaseColorTextureInfo().getExtension<Transform>('KHR_texture_transform');
	const rtTransform2 = rtMat.getEmissiveTextureInfo().getExtension<Transform>('KHR_texture_transform');
	const rtTransform3 = rtMat.getOcclusionTextureInfo().getExtension<Transform>('KHR_texture_transform');

	t.ok(rtTransform1, 'baseColorTexture transform');
	t.ok(rtTransform2, 'emissiveColorTexture transform');
	t.notOk(rtTransform3, 'occlusionColorTexture transform');

	t.equal(rtTransform1.getTexCoord(), 2, 'baseColorTexture.texCoord');
	t.deepEqual(rtTransform1.getScale(), [100, 100], 'baseColorTexture.scale');
	t.deepEqual(rtTransform1.getOffset(), [0, 0], 'baseColorTexture.offset');
	t.deepEqual(rtTransform1.getRotation(), 0, 'baseColorTexture.rotation');

	t.equal(rtTransform2.getTexCoord(), 1, 'emissiveColorTexture.texCoord');
	t.deepEqual(rtTransform2.getScale(), [1, 1], 'emissiveColorTexture.scale');
	t.deepEqual(rtTransform2.getOffset(), [0.5, 0.5], 'emissiveColorTexture.offset');
	t.deepEqual(rtTransform2.getRotation(), Math.PI, 'emissiveColorTexture.rotation');

	// Clean up extension data, revert to core glTF.
	transformExtension.dispose();
	t.notOk(mat.getBaseColorTextureInfo().getExtension('KHR_texture_transform'), 'clears baseColorTexture transform');
	t.notOk(
		mat.getEmissiveTextureInfo().getExtension('KHR_texture_transform'),
		'clears emissiveColorTexture transform'
	);

	t.end();
});

test('@gltf-transform/extensions::texture-transform | clone', (t) => {
	const srcDoc = new Document();
	const transformExtension = srcDoc.createExtension(TextureTransform);
	const tex1 = srcDoc.createTexture();
	const tex2 = srcDoc.createTexture();
	const tex3 = srcDoc.createTexture();

	const srcMat = srcDoc.createMaterial();
	srcMat
		.setBaseColorTexture(tex1)
		.getBaseColorTextureInfo()
		.setExtension(
			'KHR_texture_transform',
			transformExtension.createTransform().setTexCoord(2).setScale([100, 100])
		);
	srcMat
		.setEmissiveTexture(tex2)
		.getEmissiveTextureInfo()
		.setExtension(
			'KHR_texture_transform',
			transformExtension.createTransform().setTexCoord(1).setOffset([0.5, 0.5]).setRotation(Math.PI)
		);
	srcMat.setOcclusionTexture(tex3);

	// Clone the Document.
	const dstDoc = srcDoc.clone();

	// Ensure source Document is unchanged.

	const srcTransform1 = srcMat.getBaseColorTextureInfo().getExtension<Transform>('KHR_texture_transform');
	const srcTransform2 = srcMat.getEmissiveTextureInfo().getExtension<Transform>('KHR_texture_transform');

	t.ok(srcTransform1, 'original baseColorTexture transform unchanged');
	t.ok(srcTransform2, 'original emissiveColorTexture transform unchanged');

	// Ensure target Document matches.

	const dstMat = dstDoc.getRoot().listMaterials()[0];
	const dstTransform1 = dstMat.getBaseColorTextureInfo().getExtension<Transform>('KHR_texture_transform');
	const dstTransform2 = dstMat.getEmissiveTextureInfo().getExtension<Transform>('KHR_texture_transform');

	t.ok(dstTransform1, 'cloned baseColorTexture transform added');
	t.ok(dstTransform2, 'cloned emissiveColorTexture transform added');

	t.equal(dstTransform1.getTexCoord(), 2, 'baseColorTexture.texCoord');
	t.deepEqual(dstTransform1.getScale(), [100, 100], 'baseColorTexture.scale');
	t.deepEqual(dstTransform1.getOffset(), [0, 0], 'baseColorTexture.offset');
	t.deepEqual(dstTransform1.getRotation(), 0, 'baseColorTexture.rotation');

	t.equal(dstTransform2.getTexCoord(), 1, 'emissiveColorTexture.texCoord');
	t.deepEqual(dstTransform2.getScale(), [1, 1], 'emissiveColorTexture.scale');
	t.deepEqual(dstTransform2.getOffset(), [0.5, 0.5], 'emissiveColorTexture.offset');
	t.deepEqual(dstTransform2.getRotation(), Math.PI, 'emissiveColorTexture.rotation');

	t.end();
});

test('@gltf-transform/extensions::texture-transform | i/o', async (t) => {
	const doc = new Document();
	doc.createBuffer();
	const transformExtension = doc.createExtension(TextureTransform);
	const tex1 = doc.createTexture();

	const mat = doc.createMaterial();
	mat.setBaseColorTexture(tex1)
		.getBaseColorTextureInfo()
		.setExtension('KHR_texture_transform', transformExtension.createTransform().setScale([100, 100]));
	mat.setEmissiveTexture(tex1)
		.getEmissiveTextureInfo()
		.setExtension(
			'KHR_texture_transform',
			transformExtension.createTransform().setTexCoord(0).setOffset([0.5, 0.5]).setRotation(Math.PI)
		);

	const jsonDoc = await io.writeJSON(doc, WRITER_OPTIONS);
	const materialDef = jsonDoc.json.materials[0];
	const baseColorTextureInfoDef = materialDef.pbrMetallicRoughness.baseColorTexture;
	const emissiveTextureInfoDef = materialDef.emissiveTexture;

	t.deepEqual(
		baseColorTextureInfoDef.extensions,
		{ KHR_texture_transform: { scale: [100, 100] } }, // omit texCoord!
		'base color texture info'
	);
	t.deepEqual(
		emissiveTextureInfoDef.extensions,
		{ KHR_texture_transform: { texCoord: 0, offset: [0.5, 0.5], rotation: Math.PI } },
		'emissive texture info'
	);
	t.end();
});
