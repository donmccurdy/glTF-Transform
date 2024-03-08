import test from 'ava';
import { getPixels } from 'ndarray-pixels';
import { Document, GLTF, Material, vec4 } from '@gltf-transform/core';
import { KHRMaterialsSpecular } from '@gltf-transform/extensions';
import { palette } from '@gltf-transform/functions';
import { logger } from '@gltf-transform/test-utils';

test('basic', async (t) => {
	const document = new Document().setLogger(logger);
	const [materialA, materialB, materialC, materialD, materialE] = createMaterials(
		document,
		['A', 'B', 'C', 'D', 'E'],
		[
			[1, 0, 0, 1],
			[0, 1, 0, 1],
			[0, 0, 1, 1],
			[0, 1, 0, 1],
			[1, 0, 0, 1],
		],
		[1.0, 1.0, 1.0, 0.0, 1.0],
		['OPAQUE', 'OPAQUE', 'OPAQUE', 'OPAQUE', 'BLEND'],
	);

	await document.transform(palette({ min: 2 }));

	t.true(materialA.isDisposed(), 'disposed material A');
	t.true(materialB.isDisposed(), 'disposed material B');
	t.true(materialC.isDisposed(), 'disposed material C');
	t.true(materialD.isDisposed(), 'disposed material D');
	t.true(materialE.isDisposed(), 'disposed material E');
	t.is(document.getRoot().listMaterials().length, 2, 'separate opaque and blend materials');

	const [opaquePaletteMaterial, blendPaletteMaterial] = document.getRoot().listMaterials();

	t.is(opaquePaletteMaterial.getName(), 'PaletteMaterial001', 'creates opaque palette material');
	t.is(opaquePaletteMaterial.getAlphaMode(), 'OPAQUE', 'material.alphaMode === "OPAQUE"');

	t.is(blendPaletteMaterial.getName(), 'PaletteMaterial002', 'creates blend palette material');
	t.is(blendPaletteMaterial.getAlphaMode(), 'BLEND', 'material.alphaMode === "BLEND"');
});

test('options.blockSize', async (t) => {
	const document = new Document().setLogger(logger);
	createMaterials(
		document,
		['A', 'B', 'C', 'D', 'E'],
		[
			[1, 0, 0, 1],
			[0, 1, 0, 1],
			[0, 0, 1, 1],
			[0, 1, 0, 1],
			[1, 0, 0, 1],
		],
		new Array(5).fill(1.0),
		new Array(5).fill('OPAQUE'),
	);

	await document.transform(palette({ min: 2, blockSize: 10 }));

	t.is(document.getRoot().listMaterials().length, 1, 'only palette material remains');

	const material = document.getRoot().listMaterials()[0]!;

	t.truthy(material.getBaseColorTexture(), 'baseColorTexture = Texture');
	t.is(material.getEmissiveTexture(), null, 'emissiveTexture = null');
	t.is(material.getMetallicRoughnessTexture(), null, 'metallicRoughnessTexture = null');

	const baseColorPixels = await getPixels(material.getBaseColorTexture().getImage(), 'image/png');
	t.deepEqual(baseColorPixels.shape, [32, 16, 4], 'dimensions');
});

test('options.min', async (t) => {
	const document = new Document().setLogger(logger);
	createMaterials(
		document,
		['A', 'B', 'C', 'D', 'E'],
		[
			[1, 0, 0, 1],
			[0, 1, 0, 1],
			[0, 0, 1, 1],
			[0, 1, 0, 1],
			[1, 0, 0, 1],
		],
		new Array(5).fill(1.0),
		new Array(5).fill('OPAQUE'),
	);

	t.is(document.getRoot().listMaterials().length, 5, 'initial');

	await document.transform(palette({ min: 4 }));

	t.is(document.getRoot().listMaterials().length, 5, 'min = 4, palette = no');

	await document.transform(palette({ min: 3 }));

	t.is(document.getRoot().listMaterials().length, 1, 'min = 3, palette = yes');
});

test('preserve extensions', async (t) => {
	const document = new Document().setLogger(logger);
	const [material] = createMaterials(
		document,
		['A', 'B', 'C', 'D', 'E'],
		[
			[1, 0, 0, 1],
			[0, 1, 0, 1],
			[0, 0, 1, 1],
			[0, 1, 0, 1],
			[1, 0, 0, 1],
		],
		new Array(5).fill(1.0),
		new Array(5).fill('OPAQUE'),
	);

	const specular = document
		.createExtension(KHRMaterialsSpecular)
		.createSpecular()
		.setSpecularColorFactor([0.5, 0.5, 0.5]);
	material.setExtension('KHR_materials_specular', specular);

	await document.transform(palette({ min: 2 }));

	t.is(document.getRoot().listMaterials().length, 2, 'specular + non-specular palette materials');

	const [materialA, materialB] = document.getRoot().listMaterials();

	t.is(materialA.getName(), 'PaletteMaterial001', 'palette material #1 - name');
	t.is(materialB.getName(), 'PaletteMaterial002', 'palette material #2 - name');
	t.truthy(materialA.getExtension('KHR_materials_specular'), 'palette material #1 - spec');
	t.is(materialB.getExtension('KHR_materials_specular'), null, 'palette material #1 - nonspec');
});

test('pixel values', async (t) => {
	const document = new Document().setLogger(logger);
	createMaterials(
		document,
		['A', 'B', 'C'],
		[
			[0.218, 0.218, 0.218, 1],
			[0, 0, 0.218, 1],
			[0.218, 0, 0, 1],
		],
		new Array(3).fill(1.0),
		new Array(3).fill('OPAQUE'),
	);

	await document.transform(palette({ min: 2, blockSize: 2 }));

	const material = document.getRoot().listMaterials()[0];
	const baseColorPixels = await getPixels(material.getBaseColorTexture().getImage(), 'image/png');

	t.deepEqual(baseColorPixels.shape, [8, 2, 4], 'dimensions');
	t.deepEqual(
		Array.from(baseColorPixels.data as Uint8Array),
		// prettier-ignore
		[
			// row 1
			128, 128, 128, 255,
			128, 128, 128, 255,
			0, 0, 128, 255,
			0, 0, 128, 255,
			128, 0, 0, 255,
			128, 0, 0, 255,
			0, 0, 0, 0,
			0, 0, 0, 0,
			// row 2
			128, 128, 128, 255,
			128, 128, 128, 255,
			0, 0, 128, 255,
			0, 0, 128, 255,
			128, 0, 0, 255,
			128, 0, 0, 255,
			0, 0, 0, 0,
			0, 0, 0, 0,
		],
		'pixel values',
	);
});

test('no side effects', async (t) => {
	const document = new Document().setLogger(logger);
	const position = document.createAccessor().setType('VEC3').setArray(new Float32Array(9));
	const materialA = document.createMaterial('A').setBaseColorFactor([1, 0, 0, 1]);
	const materialB = document.createMaterial('B').setBaseColorFactor([0, 1, 0, 1]);
	const primA = document.createPrimitive().setMaterial(materialA).setAttribute('POSITION', position);
	const primB = document.createPrimitive().setMaterial(materialB).setAttribute('POSITION', position);
	document.createMesh().addPrimitive(primA).addPrimitive(primB);

	await document.transform(palette({ cleanup: false, min: 2 }));

	t.true(document.getRoot().listMaterials().length >= 2, 'skips prune and dedup');
});

/* UTILITIES */

function createMaterials(
	document: Document,
	names: string[],
	baseColorFactors: vec4[],
	roughnessFactors: number[],
	alphaModes: GLTF.MaterialAlphaMode[],
): Material[] {
	const position = document
		.createAccessor()
		.setType('VEC3')
		.setArray(new Float32Array([0, 0, 0, 0, 0, 1, 0, 1, 1]));
	const prim = document.createPrimitive().setAttribute('POSITION', position);
	const mesh = document.createMesh();

	const materials = [];
	for (let i = 0; i < names.length; i++) {
		const material = document
			.createMaterial(names[i])
			.setBaseColorFactor(baseColorFactors[i])
			.setRoughnessFactor(roughnessFactors[i])
			.setAlphaMode(alphaModes[i]);
		mesh.addPrimitive(prim.clone().setMaterial(material));
		materials.push(material);
	}

	prim.dispose();
	document.createScene().addChild(document.createNode().setMesh(mesh));

	return materials;
}
