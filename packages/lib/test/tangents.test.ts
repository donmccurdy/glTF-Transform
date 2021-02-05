require('source-map-support').install();

import test from 'tape';
import { Document } from '@gltf-transform/core';
import { tangents } from '../';

test('@gltf-transform/lib::tangents', async t => {
	const doc = new Document();
	const positionArray = new Float32Array([1, 1, 1]);
	const normalArray = new Uint16Array([0, 1, 0]);
	const texcoordArray = new Float32Array([10, 5]);
	const resultArray = new Float32Array([-1, -1, -1, -1]);
	const position = doc.createAccessor().setType('VEC3').setArray(positionArray);
	const normal = doc.createAccessor().setType('VEC3').setArray(normalArray);
	const texcoord = doc.createAccessor().setType('VEC2').setArray(texcoordArray);
	const prim = doc.createPrimitive()
		.setAttribute('POSITION', position)
		.setAttribute('NORMAL', normal)
		.setAttribute('TEXCOORD_0', texcoord);
	doc.createMesh().addPrimitive(prim);

	let a, b, c;
	await doc.transform(tangents({
		generateTangents: (_a, _b, _c) => {
			a = _a;
			b = _b;
			c = _c;
			return resultArray;
		}
	}));

	t.deepEquals(Array.from(a), Array.from(positionArray), 'provides position');
	t.deepEquals(Array.from(b), Array.from(normalArray), 'provides normal');
	t.deepEquals(Array.from(c), Array.from(texcoordArray), 'provides texcoord');
	t.equals(prim.getAttribute('TANGENT').getArray(), resultArray, 'sets tangent');
	t.end();
});
