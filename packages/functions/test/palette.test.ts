import ndarray from 'ndarray';
import { savePixels, getPixels } from 'ndarray-pixels';
import test from 'ava';
import { Document, GLTF, Logger, Material } from '@gltf-transform/core';
import { KHRMaterialsSpecular, Specular } from '@gltf-transform/extensions';
import { palette } from '@gltf-transform/functions';

// TODO: Test texture content.
// TODO: Test --min option.
// TODO: Test --blockSize option.
// TODO: Test extension retention.

const ZEROS = ndarray(new Uint8Array([0, 0, 0, 0]), [1, 1, 4]);

test('basic', async (t) => {
	const document = new Document().setLogger(new Logger(Logger.Verbosity.SILENT));
	const [materialA, materialB, materialC, materialD, materialE] = createMaterials(
		document,
		['A', 'B', 'C', 'D', 'E'],
		[0xff0000, 0x00ff00, 0x0000ff, 0x00ff00, 0xff0000],
		[1.0, 1.0, 1.0, 0.0, 1.0],
		['OPAQUE', 'OPAQUE', 'OPAQUE', 'OPAQUE', 'BLEND']
	);

	const position = document
		.createAccessor()
		.setType('VEC3')
		.setArray(new Float32Array([0, 0, 0, 0, 0, 1, 0, 1, 1]));
	const prim = document.createPrimitive().setAttribute('POSITION', position);
	const mesh = document
		.createMesh()
		.addPrimitive(prim.clone().setMaterial(materialA))
		.addPrimitive(prim.clone().setMaterial(materialB))
		.addPrimitive(prim.clone().setMaterial(materialC))
		.addPrimitive(prim.clone().setMaterial(materialD))
		.addPrimitive(prim.clone().setMaterial(materialE));
	prim.dispose();
	document.createScene().addChild(document.createNode().setMesh(mesh));

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

function createMaterials(
	document: Document,
	names: string[],
	baseColorFactors: number[],
	roughnessFactors: number[],
	alphaModes: GLTF.MaterialAlphaMode[]
): Material[] {
	const materials = [];
	for (let i = 0; i < names.length; i++) {
		const material = document
			.createMaterial(names[i])
			.setBaseColorHex(baseColorFactors[i])
			.setRoughnessFactor(roughnessFactors[i])
			.setAlphaMode(alphaModes[i]);
		materials.push(material);
	}
	return materials;
}
