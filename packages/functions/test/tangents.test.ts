import test from 'ava';
import { Document } from '@gltf-transform/core';
import { tangents } from '@gltf-transform/functions';

test('basic', async (t) => {
	const doc = new Document();
	const positionArray = new Float32Array([1, 1, 1]);
	const normalArray = new Uint16Array([0, 1, 0]);
	const texcoordArray = new Float32Array([10, 5]);
	const resultArray = new Float32Array([-1, -1, -1, -1]);
	const position = doc.createAccessor().setType('VEC3').setArray(positionArray);
	const normal = doc.createAccessor().setType('VEC3').setArray(normalArray);
	const texcoord0 = doc
		.createAccessor()
		.setType('VEC2')
		.setArray(new Float32Array([0, 0]));
	const texcoord1 = doc.createAccessor().setType('VEC2').setArray(texcoordArray);
	const normalTexture = doc.createTexture();
	const material = doc.createMaterial().setNormalTexture(normalTexture);
	material.getNormalTextureInfo().setTexCoord(1);
	const prim = doc
		.createPrimitive()
		.setMaterial(material)
		.setAttribute('POSITION', position)
		.setAttribute('NORMAL', normal)
		.setAttribute('TEXCOORD_0', texcoord0)
		.setAttribute('TEXCOORD_1', texcoord1);
	doc.createMesh().addPrimitive(prim);

	let a, b, c;
	await doc.transform(
		tangents({
			generateTangents: (_a, _b, _c) => {
				a = _a;
				b = _b;
				c = _c;
				return resultArray;
			},
		})
	);

	t.deepEqual(Array.from(a), Array.from(positionArray), 'provides position');
	t.deepEqual(Array.from(b), Array.from(normalArray), 'provides normal');
	t.deepEqual(Array.from(c), Array.from(texcoordArray), 'provides texcoord');
	t.is(prim.getAttribute('TANGENT').getArray(), resultArray, 'sets tangent');
});
