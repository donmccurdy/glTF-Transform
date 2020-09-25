require('source-map-support').install();

import * as test from 'tape';
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
