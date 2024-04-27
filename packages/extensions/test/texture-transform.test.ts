import test from 'ava';
import { Document, NodeIO } from '@gltf-transform/core';
import { Clearcoat, KHRMaterialsClearcoat, KHRTextureTransform, Transform } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';
import { logger } from '@gltf-transform/test-utils';

const WRITER_OPTIONS = { basename: 'extensionTest' };

const io = new NodeIO().registerExtensions([KHRTextureTransform]);

test('basic', async (t) => {
	const doc = new Document();
	doc.createBuffer();
	const transformExtension = doc.createExtension(KHRTextureTransform);
	const tex1 = doc.createTexture().setMimeType('image/png').setImage(new Uint8Array(10));
	const tex2 = doc.createTexture().setMimeType('image/png').setImage(new Uint8Array(15));
	const tex3 = doc.createTexture().setMimeType('image/png').setImage(new Uint8Array(20));
	const mat = doc.createMaterial();
	mat.setBaseColorTexture(tex1)
		.getBaseColorTextureInfo()
		.setExtension(
			'KHR_texture_transform',
			transformExtension.createTransform().setTexCoord(2).setScale([100, 100]),
		);
	mat.setEmissiveTexture(tex2)
		.getEmissiveTextureInfo()
		.setExtension(
			'KHR_texture_transform',
			transformExtension.createTransform().setTexCoord(1).setOffset([0.5, 0.5]).setRotation(Math.PI),
		);
	mat.setOcclusionTexture(tex3);

	// Read (roundtrip) from file.
	const rtDoc = await io.readJSON(await io.writeJSON(doc, WRITER_OPTIONS));
	const rtMat = rtDoc.getRoot().listMaterials()[0];
	const rtTransform1 = rtMat.getBaseColorTextureInfo().getExtension<Transform>('KHR_texture_transform');
	const rtTransform2 = rtMat.getEmissiveTextureInfo().getExtension<Transform>('KHR_texture_transform');
	const rtTransform3 = rtMat.getOcclusionTextureInfo().getExtension<Transform>('KHR_texture_transform');

	t.truthy(rtTransform1, 'baseColorTexture transform');
	t.truthy(rtTransform2, 'emissiveColorTexture transform');
	t.falsy(rtTransform3, 'occlusionColorTexture transform');

	t.is(rtTransform1.getTexCoord(), 2, 'baseColorTexture.texCoord');
	t.deepEqual(rtTransform1.getScale(), [100, 100], 'baseColorTexture.scale');
	t.deepEqual(rtTransform1.getOffset(), [0, 0], 'baseColorTexture.offset');
	t.deepEqual(rtTransform1.getRotation(), 0, 'baseColorTexture.rotation');

	t.is(rtTransform2.getTexCoord(), 1, 'emissiveColorTexture.texCoord');
	t.deepEqual(rtTransform2.getScale(), [1, 1], 'emissiveColorTexture.scale');
	t.deepEqual(rtTransform2.getOffset(), [0.5, 0.5], 'emissiveColorTexture.offset');
	t.deepEqual(rtTransform2.getRotation(), Math.PI, 'emissiveColorTexture.rotation');

	// Clean up extension data, revert to core glTF.
	transformExtension.dispose();
	t.falsy(mat.getBaseColorTextureInfo().getExtension('KHR_texture_transform'), 'clears baseColorTexture transform');
	t.falsy(
		mat.getEmissiveTextureInfo().getExtension('KHR_texture_transform'),
		'clears emissiveColorTexture transform',
	);
});

test('clone', (t) => {
	const srcDoc = new Document();
	const transformExtension = srcDoc.createExtension(KHRTextureTransform);
	const tex1 = srcDoc.createTexture();
	const tex2 = srcDoc.createTexture();
	const tex3 = srcDoc.createTexture();

	const srcMat = srcDoc.createMaterial();
	srcMat
		.setBaseColorTexture(tex1)
		.getBaseColorTextureInfo()
		.setExtension(
			'KHR_texture_transform',
			transformExtension.createTransform().setTexCoord(2).setScale([100, 100]),
		);
	srcMat
		.setEmissiveTexture(tex2)
		.getEmissiveTextureInfo()
		.setExtension(
			'KHR_texture_transform',
			transformExtension.createTransform().setTexCoord(1).setOffset([0.5, 0.5]).setRotation(Math.PI),
		);
	srcMat.setOcclusionTexture(tex3);

	// Clone the Document.
	const dstDoc = cloneDocument(srcDoc);

	// Ensure source Document is unchanged.

	const srcTransform1 = srcMat.getBaseColorTextureInfo().getExtension<Transform>('KHR_texture_transform');
	const srcTransform2 = srcMat.getEmissiveTextureInfo().getExtension<Transform>('KHR_texture_transform');

	t.truthy(srcTransform1, 'original baseColorTexture transform unchanged');
	t.truthy(srcTransform2, 'original emissiveColorTexture transform unchanged');

	// Ensure target Document matches.

	const dstMat = dstDoc.getRoot().listMaterials()[0];
	const dstTransform1 = dstMat.getBaseColorTextureInfo().getExtension<Transform>('KHR_texture_transform');
	const dstTransform2 = dstMat.getEmissiveTextureInfo().getExtension<Transform>('KHR_texture_transform');

	t.truthy(dstTransform1, 'cloned baseColorTexture transform added');
	t.truthy(dstTransform2, 'cloned emissiveColorTexture transform added');

	t.not(srcTransform1, dstTransform1, 'baseColorTexture transform cloned');
	t.not(srcTransform2, dstTransform2, 'emissiveColorTexture transform cloned');

	t.is(dstTransform1.getTexCoord(), 2, 'baseColorTexture.texCoord');
	t.deepEqual(dstTransform1.getScale(), [100, 100], 'baseColorTexture.scale');
	t.deepEqual(dstTransform1.getOffset(), [0, 0], 'baseColorTexture.offset');
	t.deepEqual(dstTransform1.getRotation(), 0, 'baseColorTexture.rotation');

	t.is(dstTransform2.getTexCoord(), 1, 'emissiveColorTexture.texCoord');
	t.deepEqual(dstTransform2.getScale(), [1, 1], 'emissiveColorTexture.scale');
	t.deepEqual(dstTransform2.getOffset(), [0.5, 0.5], 'emissiveColorTexture.offset');
	t.deepEqual(dstTransform2.getRotation(), Math.PI, 'emissiveColorTexture.rotation');
});

test('i/o', async (t) => {
	const doc = new Document();
	doc.createBuffer();
	const transformExtension = doc.createExtension(KHRTextureTransform);
	const tex1 = doc.createTexture();

	const mat = doc.createMaterial();
	mat.setBaseColorTexture(tex1)
		.getBaseColorTextureInfo()
		.setExtension('KHR_texture_transform', transformExtension.createTransform().setScale([100, 100]));
	mat.setEmissiveTexture(tex1)
		.getEmissiveTextureInfo()
		.setExtension(
			'KHR_texture_transform',
			transformExtension.createTransform().setTexCoord(0).setOffset([0.5, 0.5]).setRotation(Math.PI),
		);

	const jsonDoc = await io.writeJSON(doc, WRITER_OPTIONS);
	const materialDef = jsonDoc.json.materials[0];
	const baseColorTextureInfoDef = materialDef.pbrMetallicRoughness.baseColorTexture;
	const emissiveTextureInfoDef = materialDef.emissiveTexture;

	t.deepEqual(
		baseColorTextureInfoDef.extensions,
		{ KHR_texture_transform: { scale: [100, 100] } }, // omit texCoord!
		'base color texture info',
	);
	t.deepEqual(
		emissiveTextureInfoDef.extensions,
		{ KHR_texture_transform: { texCoord: 0, offset: [0.5, 0.5], rotation: Math.PI } },
		'emissive texture info',
	);
});

// See https://github.com/donmccurdy/glTF-Transform/issues/1256.
test('order independence', async (t) => {
	const documentA = new Document().setLogger(logger);
	const documentB = new Document().setLogger(logger);

	documentA.createBuffer();
	documentB.createBuffer();

	// KHR_texture_transform before KHR_materials_clearcoat
	const ioA = new NodeIO().setLogger(logger).registerExtensions([KHRTextureTransform, KHRMaterialsClearcoat]);
	const transformExtensionA = documentA.createExtension(KHRTextureTransform);
	const clearcoatExtensionA = documentA.createExtension(KHRMaterialsClearcoat);

	// KHR_materials_clearcoat before KHR_texture_transform
	const ioB = new NodeIO().setLogger(logger).registerExtensions([KHRMaterialsClearcoat, KHRTextureTransform]);
	const clearcoatExtensionB = documentB.createExtension(KHRMaterialsClearcoat);
	const transformExtensionB = documentB.createExtension(KHRTextureTransform);

	const fixtures = [
		['transform then clearcoat', ioA, documentA, transformExtensionA, clearcoatExtensionA],
		['clearcoat then transform', ioB, documentB, transformExtensionB, clearcoatExtensionB],
	] as [string, NodeIO, Document, KHRTextureTransform, KHRMaterialsClearcoat][];

	for (const [title, io, document, transformExtension, clearcoatExtension] of fixtures) {
		const texture = document.createTexture().setMimeType('image/png').setImage(new Uint8Array(10));
		const transform = transformExtension.createTransform().setScale([100, 100]);
		const material = document.createMaterial().setBaseColorTexture(texture);
		material.getBaseColorTextureInfo()!.setExtension('KHR_texture_transform', transform);

		const clearcoat = clearcoatExtension.createClearcoat().setClearcoatTexture(texture);
		clearcoat.getClearcoatTextureInfo()!.setExtension('KHR_texture_transform', transform);
		material.setExtension('KHR_materials_clearcoat', clearcoat);

		const { json, resources } = await io.writeJSON(document);

		t.deepEqual(
			json.materials,
			[
				{
					extensions: {
						KHR_materials_clearcoat: {
							clearcoatFactor: 0,
							clearcoatRoughnessFactor: 0,
							clearcoatTexture: {
								extensions: { KHR_texture_transform: { scale: [100, 100] } },
								index: 0,
							},
						},
					},
					pbrMetallicRoughness: {
						baseColorTexture: {
							extensions: { KHR_texture_transform: { scale: [100, 100] } },
							index: 0,
						},
					},
				},
			],
			`writes material (${title})`,
		);

		const dstDocument = await io.readJSON({ json, resources });
		const dstMaterial = dstDocument.getRoot().listMaterials()[0];
		const dstClearcoat = dstMaterial.getExtension<Clearcoat>('KHR_materials_clearcoat');
		const dstTransform = dstClearcoat.getClearcoatTextureInfo()!.getExtension<Transform>('KHR_texture_transform');
		t.deepEqual(dstTransform.getScale(), [100, 100], `reads transform.scale (${title})`);
	}
});
