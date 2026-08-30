import { deepEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document } from '@gltf-transform/core';
import { normals } from '@gltf-transform/functions';
import { logger } from '@gltf-transform/test-utils';

describe('functions::normals', () => {
	test('basic', async () => {
		const doc = new Document().setLogger(logger);
		const indicesArray = new Uint16Array([0, 1, 2]);
		const positionArray = new Float32Array([0, 0, 0, 0, 0, 1, 1, 0, 0]);
		const normalArray = new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0]);
		const resultArray = new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]);
		const indices = doc.createAccessor().setType('SCALAR').setArray(indicesArray);
		const position = doc.createAccessor().setType('VEC3').setArray(positionArray);
		const normal = doc.createAccessor().setType('VEC3').setArray(normalArray);
		const prim = doc
			.createPrimitive()
			.setIndices(indices)
			.setAttribute('POSITION', position)
			.setAttribute('NORMAL', normal);
		doc.createMesh().addPrimitive(prim);

		await doc.transform(normals({ overwrite: false }));

		deepEqual(prim.getAttribute('NORMAL').getArray(), normalArray, 'skips normals');

		await doc.transform(normals({ overwrite: true }));

		deepEqual(prim.getAttribute('NORMAL').getArray(), resultArray, 'overwrites normals');
	});
});
