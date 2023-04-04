import test from 'ava';
import { Accessor, Document, GLTF, Primitive, Transform, TransformContext } from '@gltf-transform/core';
import { getGLPrimitiveCount, createTransform, isTransformPending } from '@gltf-transform/functions';

test('getGLPrimitiveCount', async (t) => {
	const doc = new Document();

	const indices = doc.createAccessor().setArray(new Uint16Array(6));
	const position = doc.createAccessor().setType(Accessor.Type.VEC3).setArray(new Float32Array(99));
	const prim = doc.createPrimitive().setMode(Primitive.Mode.TRIANGLES).setAttribute('POSITION', position);
	const indexedPrim = prim.clone().setIndices(indices);

	t.is(getGLPrimitiveCount(prim), 11, 'triangles');
	t.is(getGLPrimitiveCount(indexedPrim), 2, 'triangles (indexed)');

	prim.setMode(Primitive.Mode.POINTS);
	t.is(getGLPrimitiveCount(prim), 33, 'points');

	prim.setMode(Primitive.Mode.LINES);
	indexedPrim.setMode(Primitive.Mode.LINES);
	t.is(getGLPrimitiveCount(prim), 33 / 2, 'lines');
	t.is(getGLPrimitiveCount(indexedPrim), 3, 'lines (indexed)');

	prim.setMode(Primitive.Mode.LINE_STRIP);
	t.is(getGLPrimitiveCount(prim), 32, 'line strip');

	prim.setMode(Primitive.Mode.LINE_LOOP);
	t.is(getGLPrimitiveCount(prim), 33, 'line loop');

	prim.setMode(Primitive.Mode.TRIANGLE_FAN);
	t.is(getGLPrimitiveCount(prim), 31, 'triangle strip');

	prim.setMode(Primitive.Mode.TRIANGLE_STRIP);
	t.is(getGLPrimitiveCount(prim), 31, 'triangle fan');

	prim.setMode('TEST' as unknown as GLTF.MeshPrimitiveMode);
	t.throws(() => getGLPrimitiveCount(prim), { message: /mode/i }, 'invalid');
});

test('transform pipeline', async (t) => {
	const doc = new Document();
	const first = createTransform('first', (_: Document, context?: TransformContext) => {
		if (!isTransformPending(context, 'first', 'second')) {
			throw new Error('Out of order!');
		}
	});
	const second: Transform = (_: Document) => undefined;

	t.truthy(doc.transform(first, second), '[a, b] OK');

	try {
		await doc.transform(second, first);
		t.fail('[b, a] NOT OK');
	} catch (e) {
		t.truthy(/out of order/i.test((e as Error).message), '[b, a] NOT OK');
	}
});
