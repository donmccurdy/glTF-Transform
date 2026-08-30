import { deepEqual, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Accessor, Document } from '@gltf-transform/core';
import { vertexColorSpace } from '@gltf-transform/functions';

describe('functions::vertexColorSpace', () => {
	test('basic', () => {
		const input = [0.25882352941176473, 0.5215686274509804, 0.9568627450980393]; // sRGB
		const expected = [0.054480276435339814, 0.23455058215026167, 0.9046611743890203]; // linear

		const doc = new Document();
		const mesh = doc.createMesh('test-mesh');

		const primitive1 = doc.createPrimitive();
		const primitive2 = doc.createPrimitive();
		mesh.addPrimitive(primitive1);
		mesh.addPrimitive(primitive2);

		const accessor1 = doc.createAccessor('#1');
		const accessor2 = doc.createAccessor('#2');
		accessor1.setType(Accessor.Type.VEC3).setArray(new Float32Array([...input, ...input]));
		accessor2.setType(Accessor.Type.VEC4).setArray(new Float32Array([...input, 0.5]));

		primitive1.setAttribute('COLOR_0', accessor1).setAttribute('COLOR_1', accessor2);
		primitive2.setAttribute('COLOR_0', accessor1);

		vertexColorSpace({ inputColorSpace: 'srgb' })(doc);

		let actual;

		actual = primitive1.getAttribute('COLOR_0').getArray();
		strictEqual(actual[0].toFixed(3), expected[0].toFixed(3), 'prim1.color1[0].r');
		strictEqual(actual[1].toFixed(3), expected[1].toFixed(3), 'prim1.color1[0].g');
		strictEqual(actual[2].toFixed(3), expected[2].toFixed(3), 'prim1.color1[0].b');
		strictEqual(actual[3].toFixed(3), expected[0].toFixed(3), 'prim1.color1[1].r');
		strictEqual(actual[4].toFixed(3), expected[1].toFixed(3), 'prim1.color1[1].g');
		strictEqual(actual[5].toFixed(3), expected[2].toFixed(3), 'prim1.color1[1].b');

		actual = primitive1.getAttribute('COLOR_1').getArray();
		strictEqual(actual[0].toFixed(3), expected[0].toFixed(3), 'prim1.color2[0].r');
		strictEqual(actual[1].toFixed(3), expected[1].toFixed(3), 'prim1.color2[0].g');
		strictEqual(actual[2].toFixed(3), expected[2].toFixed(3), 'prim1.color2[0].b');
		strictEqual(actual[3].toFixed(3), '0.500', 'prim1.color2[0].a');

		deepEqual(primitive1.getAttribute('COLOR_0'), primitive2.getAttribute('COLOR_0'), 'shared COLOR_0 accessor');
	});
});
