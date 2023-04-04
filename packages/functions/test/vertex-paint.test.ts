import test from 'ava';
import { ColorUtils, Document, vec3, vec4 } from '@gltf-transform/core';
import { vertexPaint } from '@gltf-transform/functions';
import ndarray from 'ndarray';
import { savePixels } from 'ndarray-pixels';

test('basic', async (t) => {
	const pixels = ndarray(
		// prettier-ignore
		new Uint8Array([
			64, 64, 128, 255,
			64, 64, 64, 255,
			255, 255, 64, 255,
			255, 255, 255, 255,
		]),
		[4, 1, 4]
	);
	const image = await savePixels(pixels, 'image/png');

	// prettier-ignore
	const uvArray = [
		0.125, 0.5,
		0.375, 0.5,
		0.625, 0.5,
		0.875, 0.5
	];

	// Comparison made in 'srgb', even though vertex colors are stored in 'srgb-linear'.
	const expectedVertexColors = [0x404080, 0x404040, 0xfefe40, 0xfefefe].map(hexToString);

	const document = new Document();
	const texture = document.createTexture().setImage(image).setMimeType('image/png');
	const material = document.createMaterial().setBaseColorTexture(texture);
	material.getBaseColorTextureInfo().setTexCoord(1);
	const position = document.createAccessor().setArray(new Float32Array(12)).setType('VEC3');
	const texcoord0 = document.createAccessor().setArray(new Float32Array(8)).setType('VEC2');
	const texcoord1 = document.createAccessor().setArray(new Float32Array(uvArray)).setType('VEC2');
	const prim = document
		.createPrimitive()
		.setMaterial(material)
		.setAttribute('POSITION', position)
		.setAttribute('TEXCOORD_0', texcoord0)
		.setAttribute('TEXCOORD_1', texcoord1);
	document.createMesh().addPrimitive(prim);

	await document.transform(vertexPaint());

	// TODO(design): What happens if the material has other textures?
	// TODO(design): What happens if the material has other UVs?
	// TODO(design): Should we remove the UVs?

	const color = prim.getAttribute('COLOR_0')!;
	t.truthy(color, 'prim has COLOR_0');
	t.is(color.getType(), 'VEC3', 'type = "VEC3"');
	t.is(color.getCount(), 4, 'count = 4');

	const actualVertexColors = factorListToHexList(Array.from(color.getArray()));
	t.deepEqual(actualVertexColors, expectedVertexColors, 'expected values');
});

/* UTILITIES */

function factorListToHexList(src: number[], size = 3): string[] {
	const dst = [] as number[];
	const el = [] as unknown as vec3 | vec4;
	for (let i = 0, il = src.length / size; i < il; i++) {
		for (let j = 0; j < size; j++) {
			el[j] = src[i * size + j];
		}
		dst.push(factorToHex(ColorUtils.convertLinearToSRGB(el, el)));
	}
	return dst.map(hexToString);
}

/** Module version applies an unwanted color space conversion. */
function factorToHex<T extends vec3 | vec4>(factor: T): number {
	const [r, g, b] = [...(factor as unknown as number[])] as unknown as T;
	return ((r * 255) << 16) ^ ((g * 255) << 8) ^ ((b * 255) << 0);
}

function hexToString(hex: number): string {
	return '#' + ('000000' + hex.toString(16)).slice(-6);
}
