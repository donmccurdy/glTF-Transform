require('source-map-support').install();

import * as test from 'tape';
import { Accessor, Document, GLTF } from '@gltf-transform/core';
import { getGLPrimitiveCount } from '../src/utils';

test('@gltf-transform/lib::utils | getGLPrimitiveCount', async t => {
	const doc = new Document();

	const indices = doc.createAccessor()
		.setArray(new Uint16Array(6));
	const position = doc.createAccessor()
		.setType(Accessor.Type.VEC3)
		.setArray(new Float32Array(99));
	const prim = doc.createPrimitive()
		.setMode(GLTF.MeshPrimitiveMode.TRIANGLES)
		.setAttribute('POSITION', position);
	const indexedPrim = prim.clone().setIndices(indices);

	t.equals(getGLPrimitiveCount(prim), 11, 'triangles');
	t.equals(getGLPrimitiveCount(indexedPrim), 2, 'triangles (indexed)');

	prim.setMode(GLTF.MeshPrimitiveMode.POINTS);
	t.equals(getGLPrimitiveCount(prim), 33, 'points');

	prim.setMode(GLTF.MeshPrimitiveMode.LINES);
	indexedPrim.setMode(GLTF.MeshPrimitiveMode.LINES);
	t.equals(getGLPrimitiveCount(prim), 33 / 2, 'lines');
	t.equals(getGLPrimitiveCount(indexedPrim), 3, 'lines (indexed)');

	prim.setMode(GLTF.MeshPrimitiveMode.LINE_STRIP);
	t.equals(getGLPrimitiveCount(prim), 32, 'line strip');

	prim.setMode(GLTF.MeshPrimitiveMode.LINE_LOOP);
	t.equals(getGLPrimitiveCount(prim), 33, 'line loop');

	prim.setMode(GLTF.MeshPrimitiveMode.TRIANGLE_FAN);
	t.equals(getGLPrimitiveCount(prim), 31, 'triangle strip');

	prim.setMode(GLTF.MeshPrimitiveMode.TRIANGLE_STRIP);
	t.equals(getGLPrimitiveCount(prim), 31, 'triangle fan');

	prim.setMode('TEST' as unknown as GLTF.MeshPrimitiveMode);
	t.throws(() => getGLPrimitiveCount(prim), 'invalid');

	t.end();
});
