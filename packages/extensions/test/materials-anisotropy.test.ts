import test from 'ava';
import { Document, NodeIO } from '@gltf-transform/core';
import { Anisotropy, KHRMaterialsAnisotropy } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';

const WRITER_OPTIONS = { basename: 'extensionTest' };

test('factors', async (t) => {
	const document = new Document();
	const anisotropyExtension = document.createExtension(KHRMaterialsAnisotropy);
	const anisotropy = anisotropyExtension
		.createAnisotropy()
		.setAnisotropyStrength(0.9)
		.setAnisotropyRotation(Math.PI / 3);

	document
		.createMaterial('MyAnisotropyMaterial')
		.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
		.setExtension('KHR_materials_anisotropy', anisotropy);

	const io = new NodeIO().registerExtensions([KHRMaterialsAnisotropy]);
	const roundtripDoc = await io.readJSON(await io.writeJSON(document));
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
	const roundtripExt = roundtripMat.getExtension<Anisotropy>('KHR_materials_anisotropy');

	t.is(roundtripExt.getAnisotropyStrength(), 0.9, 'reads anisotropyStrength');
	t.is(roundtripExt.getAnisotropyRotation(), Math.PI / 3, 'reads anisotropyRottaion');
});

test('textures', async (t) => {
	const document = new Document();
	document.createBuffer();
	const anisotropyExtension = document.createExtension(KHRMaterialsAnisotropy);
	const anisotropy = anisotropyExtension
		.createAnisotropy()
		.setAnisotropyStrength(0.9)
		.setAnisotropyRotation(Math.PI / 3)
		.setAnisotropyTexture(document.createTexture().setImage(new Uint8Array(1)));

	const material = document
		.createMaterial('MyAnisotropyMaterial')
		.setBaseColorFactor([1.0, 0.5, 0.5, 1.0])
		.setExtension('KHR_materials_anisotropy', anisotropy);

	t.is(material.getExtension('KHR_materials_anisotropy'), anisotropy, 'anisotropy is attached');

	const jsonDoc = await new NodeIO().registerExtensions([KHRMaterialsAnisotropy]).writeJSON(document, WRITER_OPTIONS);
	const materialDef = jsonDoc.json.materials[0];

	t.deepEqual(materialDef.pbrMetallicRoughness.baseColorFactor, [1.0, 0.5, 0.5, 1.0], 'writes base color');
	t.deepEqual(
		materialDef.extensions,
		{
			KHR_materials_anisotropy: {
				anisotropyStrength: 0.9,
				anisotropyRotation: Math.PI / 3,
				anisotropyTexture: { index: 0 },
			},
		},
		'writes anisotropy extension',
	);
	t.deepEqual(jsonDoc.json.extensionsUsed, [KHRMaterialsAnisotropy.EXTENSION_NAME], 'writes extensionsUsed');

	anisotropyExtension.dispose();
	t.is(material.getExtension('KHR_materials_anisotropy'), null, 'anisotropy is detached');

	const roundtripDoc = await new NodeIO().registerExtensions([KHRMaterialsAnisotropy]).readJSON(jsonDoc);
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
	const roundtripExt = roundtripMat.getExtension<Anisotropy>('KHR_materials_anisotropy');

	t.is(roundtripExt.getAnisotropyStrength(), 0.9, 'reads anisotropyStrength');
	t.is(roundtripExt.getAnisotropyRotation(), Math.PI / 3, 'reads anisotropyRotation');
	t.truthy(roundtripExt.getAnisotropyTexture(), 'reads anisotropyTexture');
});

test('disabled', async (t) => {
	const document = new Document();
	document.createExtension(KHRMaterialsAnisotropy);
	document.createMaterial();

	const io = new NodeIO().registerExtensions([KHRMaterialsAnisotropy]);
	const roundtripDoc = await io.readJSON(await io.writeJSON(document));
	const roundtripMat = roundtripDoc.getRoot().listMaterials().pop();
	t.is(roundtripMat.getExtension('KHR_materials_anisotropy'), null, 'no effect when not attached');
});

test('copy', (t) => {
	const document = new Document();
	const anisotropyExtension = document.createExtension(KHRMaterialsAnisotropy);
	const anisotropy = anisotropyExtension
		.createAnisotropy()
		.setAnisotropyStrength(0.9)
		.setAnisotropyRotation(Math.PI / 3)
		.setAnisotropyTexture(document.createTexture('ABC'));
	document.createMaterial().setExtension('KHR_materials_anisotropy', anisotropy);

	const document2 = cloneDocument(document);
	const anisotropy2 = document2.getRoot().listMaterials()[0].getExtension<Anisotropy>('KHR_materials_anisotropy');
	t.is(document2.getRoot().listExtensionsUsed().length, 1, 'copy KHRMaterialsAnisotropy');
	t.truthy(anisotropy2, 'copy Anisotropy');
	t.is(anisotropy2.getAnisotropyStrength(), 0.9, 'copy anisotropyStrength');
	t.is(anisotropy2.getAnisotropyRotation(), Math.PI / 3, 'copy anisotropyRotation');
	t.is(anisotropy2.getAnisotropyTexture().getName(), 'ABC', 'copy anisotropyTexture');
});
