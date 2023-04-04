import ndarray from 'ndarray';
import { savePixels, getPixels } from 'ndarray-pixels';
import test from 'ava';
import { Document } from '@gltf-transform/core';
import {
	IOR,
	KHRMaterialsIOR,
	KHRMaterialsPBRSpecularGlossiness,
	KHRMaterialsSpecular,
	Specular,
} from '@gltf-transform/extensions';
import { metalRough } from '@gltf-transform/functions';

const ZEROS = ndarray(new Uint8Array([0, 0, 0, 0]), [1, 1, 4]);

const DIFFUSE = ndarray(new Uint8Array([64, 64, 128, 1]), [1, 1, 4]);

const SPEC_GLOSS = ndarray(new Uint8Array([255, 0, 0, 0, 0, 255, 0, 64, 0, 0, 255, 128, 0, 0, 0, 255]), [1, 4, 4]);

const SPEC = ndarray(new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 0, 0, 0, 255]), [1, 4, 4]);

// orm.G = 1 - specGloss.A * glossFactor
const ROUGH = ndarray(new Uint8Array([0, 255, 0, 255, 0, 223, 0, 255, 0, 191, 0, 255, 0, 127, 0, 255]), [1, 4, 4]);

test('textures', async (t) => {
	const doc = new Document();
	const baseColorTex = doc
		.createTexture()
		.setImage(await savePixels(ZEROS, 'image/png'))
		.setMimeType('image/png');
	const metalRoughTex = doc
		.createTexture()
		.setImage(await savePixels(ZEROS, 'image/png'))
		.setMimeType('image/png');
	const diffuseTex = doc
		.createTexture()
		.setImage(await savePixels(DIFFUSE, 'image/png'))
		.setMimeType('image/png');
	const specGlossTex = doc
		.createTexture()
		.setImage(await savePixels(SPEC_GLOSS, 'image/png'))
		.setMimeType('image/png');
	const specGlossExtension = doc.createExtension(KHRMaterialsPBRSpecularGlossiness);
	const specGloss = specGlossExtension
		.createPBRSpecularGlossiness()
		.setDiffuseTexture(diffuseTex)
		.setSpecularGlossinessTexture(specGlossTex)
		.setGlossinessFactor(0.5);
	const mat = doc
		.createMaterial()
		.setBaseColorTexture(baseColorTex)
		.setMetallicRoughnessTexture(metalRoughTex)
		.setExtension('KHR_materials_pbrSpecularGlossiness', specGloss);

	await doc.transform(metalRough());

	const specularExtension = mat.getExtension<Specular>('KHR_materials_specular');
	const extensionsUsed = doc
		.getRoot()
		.listExtensionsUsed()
		.map((e) => e.extensionName)
		.sort();

	t.deepEqual(
		extensionsUsed,
		[KHRMaterialsIOR.EXTENSION_NAME, KHRMaterialsSpecular.EXTENSION_NAME],
		'uses KHR_materials_ior and KHR_materials_specular'
	);
	t.truthy(specGloss.isDisposed(), 'disposes PBRSpecularGlossiness');
	t.truthy(baseColorTex.isDisposed(), 'disposes baseColorTexture');
	t.truthy(metalRoughTex.isDisposed(), 'disposes metalRoughTexture');
	t.truthy(specGlossTex.isDisposed(), 'disposes specGlossTexture');
	t.deepEqual(
		Array.from((await getPixels(mat.getBaseColorTexture().getImage(), 'image/png')).data),
		Array.from(DIFFUSE.data),
		'diffuse -> baseColor'
	);
	t.deepEqual(
		Array.from((await getPixels(mat.getMetallicRoughnessTexture().getImage(), 'image/png')).data),
		Array.from(ROUGH.data),
		'spec -> rough'
	);
	t.deepEqual(
		Array.from((await getPixels(specularExtension.getSpecularTexture().getImage(), 'image/png')).data),
		Array.from(SPEC.data),
		'spec -> spec'
	);
	t.is(mat.getExtension<IOR>('KHR_materials_ior').getIOR(), 1000, 'ior = 1000');
	t.is(mat.getRoughnessFactor(), 1, 'roughnessFactor = 1');
	t.is(mat.getMetallicFactor(), 0, 'metallicFactor = 0');
	t.is(doc.getRoot().listTextures().length, 3, 'correct texture count');
});

test('factors', async (t) => {
	const doc = new Document();
	const specGlossExtension = doc.createExtension(KHRMaterialsPBRSpecularGlossiness);
	const specGloss = specGlossExtension
		.createPBRSpecularGlossiness()
		.setDiffuseFactor([0, 1, 0, 0.5])
		.setSpecularFactor([1, 0.5, 0.5])
		.setGlossinessFactor(0.9);
	const mat = doc
		.createMaterial()
		.setBaseColorFactor([1, 0, 0, 1])
		.setMetallicFactor(0.25)
		.setRoughnessFactor(0.75)
		.setExtension('KHR_materials_pbrSpecularGlossiness', specGloss);

	await doc.transform(metalRough());

	const extensionsUsed = doc
		.getRoot()
		.listExtensionsUsed()
		.map((e) => e.extensionName)
		.sort();

	t.deepEqual(
		extensionsUsed,
		[KHRMaterialsIOR.EXTENSION_NAME, KHRMaterialsSpecular.EXTENSION_NAME],
		'uses KHR_materials_ior and KHR_materials_specular'
	);
	t.deepEqual(mat.getBaseColorFactor(), [0, 1, 0, 0.5], 'baseColorFactor = diffuseFactor');
	t.is(mat.getExtension<Specular>('KHR_materials_specular').getSpecularFactor(), 1, 'specularFactor = 1');
	t.deepEqual(
		mat.getExtension<Specular>('KHR_materials_specular').getSpecularColorFactor(),
		[1, 0.5, 0.5],
		'specularColorFactor = specularFactor'
	);
	t.is(mat.getExtension<IOR>('KHR_materials_ior').getIOR(), 1000, 'ior = 1000');
	t.is(mat.getRoughnessFactor().toFixed(3), '0.100', 'roughnessFactor = 1 - glossFactor');
	t.is(mat.getMetallicFactor(), 0, 'metallicFactor = 0');
	t.is(doc.getRoot().listTextures().length, 0, 'no textures');
});
