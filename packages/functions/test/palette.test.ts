import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, type GLTF, type Material, type vec4 } from '@gltf-transform/core';
import { KHRMaterialsSpecular } from '@gltf-transform/extensions';
import { palette } from '@gltf-transform/functions';
import { logger } from '@gltf-transform/test-utils';
import { getPixels } from 'ndarray-pixels';

describe('functions::palette', () => {
	test('basic', async () => {
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

		ok(materialA.isDisposed(), 'disposed material A');
		ok(materialB.isDisposed(), 'disposed material B');
		ok(materialC.isDisposed(), 'disposed material C');
		ok(materialD.isDisposed(), 'disposed material D');
		ok(materialE.isDisposed(), 'disposed material E');
		strictEqual(document.getRoot().listMaterials().length, 2, 'separate opaque and blend materials');

		const [opaquePaletteMaterial, blendPaletteMaterial] = document.getRoot().listMaterials();

		strictEqual(opaquePaletteMaterial.getName(), 'PaletteMaterial001', 'creates opaque palette material');
		strictEqual(opaquePaletteMaterial.getAlphaMode(), 'OPAQUE', 'material.alphaMode === "OPAQUE"');

		strictEqual(blendPaletteMaterial.getName(), 'PaletteMaterial002', 'creates blend palette material');
		strictEqual(blendPaletteMaterial.getAlphaMode(), 'BLEND', 'material.alphaMode === "BLEND"');
	});

	test('options.blockSize', async () => {
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

		strictEqual(document.getRoot().listMaterials().length, 1, 'only palette material remains');

		const material = document.getRoot().listMaterials()[0]!;

		ok(material.getBaseColorTexture(), 'baseColorTexture = Texture');
		strictEqual(material.getEmissiveTexture(), null, 'emissiveTexture = null');
		strictEqual(material.getMetallicRoughnessTexture(), null, 'metallicRoughnessTexture = null');

		const baseColorPixels = await getPixels(material.getBaseColorTexture().getImage(), 'image/png');
		deepEqual(baseColorPixels.shape, [32, 16, 4], 'dimensions');
	});

	test('options.min', async () => {
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

		strictEqual(document.getRoot().listMaterials().length, 5, 'initial');

		await document.transform(palette({ min: 4 }));

		strictEqual(document.getRoot().listMaterials().length, 5, 'min = 4, palette = no');

		await document.transform(palette({ min: 3 }));

		strictEqual(document.getRoot().listMaterials().length, 1, 'min = 3, palette = yes');
	});

	test('preserve extensions', async () => {
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

		strictEqual(document.getRoot().listMaterials().length, 2, 'specular + non-specular palette materials');

		const [materialA, materialB] = document.getRoot().listMaterials();

		strictEqual(materialA.getName(), 'PaletteMaterial001', 'palette material #1 - name');
		strictEqual(materialB.getName(), 'PaletteMaterial002', 'palette material #2 - name');
		ok(materialA.getExtension('KHR_materials_specular'), 'palette material #1 - spec');
		strictEqual(materialB.getExtension('KHR_materials_specular'), null, 'palette material #1 - nonspec');
	});

	test('pixel values', async () => {
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

		deepEqual(baseColorPixels.shape, [8, 2, 4], 'dimensions');
		deepEqual(
			Array.from(baseColorPixels.data as Uint8Array),
			// biome-ignore format: Readability.
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

	test('preserve UVs', async () => {
		const document = new Document().setLogger(logger);

		const position = document.createAccessor().setType('VEC3').setArray(new Float32Array(9));
		const uv = document.createAccessor().setType('VEC2').setArray(new Uint8Array(6));

		const materialA = document.createMaterial('A').setBaseColorFactor([1, 0, 0, 1]);
		const materialB = document.createMaterial('B').setBaseColorFactor([0, 1, 0, 1]);
		const materialC = document.createMaterial('C').setBaseColorFactor([0, 0, 1, 1]);

		const primA = document.createPrimitive().setMaterial(materialA).setAttribute('POSITION', position);
		const primB = document.createPrimitive().setMaterial(materialB).setAttribute('POSITION', position);
		const primC = document
			.createPrimitive()
			.setMaterial(materialC)
			.setAttribute('POSITION', position)
			.setAttribute('TEXCOORD_0', uv);

		document.createMesh().addPrimitive(primA).addPrimitive(primB).addPrimitive(primC);

		await document.transform(palette({ min: 2 }));

		strictEqual(document.getRoot().listMaterials().length, 2, 'one material per texCoord index');

		const paletteMaterials = document.getRoot().listMaterials();
		const paletteMaterialA = paletteMaterials[0];
		const paletteMaterialB = paletteMaterials[1];

		strictEqual(paletteMaterialA.getBaseColorTextureInfo().getTexCoord(), 0, 'texCoord = 0');
		strictEqual(paletteMaterialB.getBaseColorTextureInfo().getTexCoord(), 1, 'texCoord = 1');
		strictEqual(paletteMaterialA.getBaseColorTexture(), paletteMaterialB.getBaseColorTexture(), 'same texture');
	});
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
