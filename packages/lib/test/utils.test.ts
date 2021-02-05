require('source-map-support').install();

import test from 'tape';
import { Accessor, Document, GLTF, Primitive } from '@gltf-transform/core';
import { getGLPrimitiveCount } from '../src/utils';

test('@gltf-transform/lib::utils | getGLPrimitiveCount', async t => {
	const doc = new Document();

	const indices = doc.createAccessor()
		.setArray(new Uint16Array(6));
	const position = doc.createAccessor()
		.setType(Accessor.Type.VEC3)
		.setArray(new Float32Array(99));
	const prim = doc.createPrimitive()
		.setMode(Primitive.Mode.TRIANGLES)
		.setAttribute('POSITION', position);
	const indexedPrim = prim.clone().setIndices(indices);

	t.equals(getGLPrimitiveCount(prim), 11, 'triangles');
	t.equals(getGLPrimitiveCount(indexedPrim), 2, 'triangles (indexed)');

	prim.setMode(Primitive.Mode.POINTS);
	t.equals(getGLPrimitiveCount(prim), 33, 'points');

	prim.setMode(Primitive.Mode.LINES);
	indexedPrim.setMode(Primitive.Mode.LINES);
	t.equals(getGLPrimitiveCount(prim), 33 / 2, 'lines');
	t.equals(getGLPrimitiveCount(indexedPrim), 3, 'lines (indexed)');

	prim.setMode(Primitive.Mode.LINE_STRIP);
	t.equals(getGLPrimitiveCount(prim), 32, 'line strip');

	prim.setMode(Primitive.Mode.LINE_LOOP);
	t.equals(getGLPrimitiveCount(prim), 33, 'line loop');

	prim.setMode(Primitive.Mode.TRIANGLE_FAN);
	t.equals(getGLPrimitiveCount(prim), 31, 'triangle strip');

	prim.setMode(Primitive.Mode.TRIANGLE_STRIP);
	t.equals(getGLPrimitiveCount(prim), 31, 'triangle fan');

	prim.setMode('TEST' as unknown as GLTF.MeshPrimitiveMode);
	t.throws(() => getGLPrimitiveCount(prim), 'invalid');

	t.end();
});
