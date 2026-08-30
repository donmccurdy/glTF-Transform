import { deepEqual, notStrictEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, NodeIO } from '@gltf-transform/core';
import { type Clearcoat, KHRMaterialsClearcoat, KHRTextureTransform, type Transform } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';
import { logger } from '@gltf-transform/test-utils';

const WRITER_OPTIONS = { basename: 'extensionTest' };

const io = new NodeIO().registerExtensions([KHRTextureTransform]);

describe('extensions::KHRTextureTransform', () => {
	test('basic', async () => {
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

		ok(rtTransform1, 'baseColorTexture transform');
		ok(rtTransform2, 'emissiveColorTexture transform');
		strictEqual(rtTransform3, null, 'occlusionColorTexture transform');

		strictEqual(rtTransform1.getTexCoord(), 2, 'baseColorTexture.texCoord');
		deepEqual(rtTransform1.getScale(), [100, 100], 'baseColorTexture.scale');
		deepEqual(rtTransform1.getOffset(), [0, 0], 'baseColorTexture.offset');
		deepEqual(rtTransform1.getRotation(), 0, 'baseColorTexture.rotation');

		strictEqual(rtTransform2.getTexCoord(), 1, 'emissiveColorTexture.texCoord');
		deepEqual(rtTransform2.getScale(), [1, 1], 'emissiveColorTexture.scale');
		deepEqual(rtTransform2.getOffset(), [0.5, 0.5], 'emissiveColorTexture.offset');
		deepEqual(rtTransform2.getRotation(), Math.PI, 'emissiveColorTexture.rotation');

		// Clean up extension data, revert to core glTF.
		transformExtension.dispose();
		strictEqual(
			mat.getBaseColorTextureInfo().getExtension('KHR_texture_transform'),
			null,
			'clears baseColorTexture transform',
		);
		strictEqual(
			mat.getEmissiveTextureInfo().getExtension('KHR_texture_transform'),
			null,
			'clears emissiveColorTexture transform',
		);
	});

	test('clone', () => {
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

		ok(srcTransform1, 'original baseColorTexture transform unchanged');
		ok(srcTransform2, 'original emissiveColorTexture transform unchanged');

		// Ensure target Document matches.

		const dstMat = dstDoc.getRoot().listMaterials()[0];
		const dstTransform1 = dstMat.getBaseColorTextureInfo().getExtension<Transform>('KHR_texture_transform');
		const dstTransform2 = dstMat.getEmissiveTextureInfo().getExtension<Transform>('KHR_texture_transform');

		ok(dstTransform1, 'cloned baseColorTexture transform added');
		ok(dstTransform2, 'cloned emissiveColorTexture transform added');

		notStrictEqual(srcTransform1, dstTransform1, 'baseColorTexture transform cloned');
		notStrictEqual(srcTransform2, dstTransform2, 'emissiveColorTexture transform cloned');

		strictEqual(dstTransform1.getTexCoord(), 2, 'baseColorTexture.texCoord');
		deepEqual(dstTransform1.getScale(), [100, 100], 'baseColorTexture.scale');
		deepEqual(dstTransform1.getOffset(), [0, 0], 'baseColorTexture.offset');
		deepEqual(dstTransform1.getRotation(), 0, 'baseColorTexture.rotation');

		strictEqual(dstTransform2.getTexCoord(), 1, 'emissiveColorTexture.texCoord');
		deepEqual(dstTransform2.getScale(), [1, 1], 'emissiveColorTexture.scale');
		deepEqual(dstTransform2.getOffset(), [0.5, 0.5], 'emissiveColorTexture.offset');
		deepEqual(dstTransform2.getRotation(), Math.PI, 'emissiveColorTexture.rotation');
	});

	test('i/o', async () => {
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

		deepEqual(
			baseColorTextureInfoDef.extensions,
			{ KHR_texture_transform: { scale: [100, 100] } }, // omit texCoord!
			'base color texture info',
		);
		deepEqual(
			emissiveTextureInfoDef.extensions,
			{ KHR_texture_transform: { texCoord: 0, offset: [0.5, 0.5], rotation: Math.PI } },
			'emissive texture info',
		);
	});

	// See https://github.com/donmccurdy/glTF-Transform/issues/1256.
	test('order independence', async () => {
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

			deepEqual(
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
			const dstTransform = dstClearcoat
				.getClearcoatTextureInfo()!
				.getExtension<Transform>('KHR_texture_transform');
			deepEqual(dstTransform.getScale(), [100, 100], `reads transform.scale (${title})`);
		}
	});
});
