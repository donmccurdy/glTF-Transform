import test from 'ava';
import { Accessor, Document, GLTF, Primitive, Transform, TransformContext } from '@gltf-transform/core';
import { getGLPrimitiveCount, createTransform, isTransformPending, assignDefaults } from '@gltf-transform/functions';

test('assignDefaults', (t) => {
	t.deepEqual(assignDefaults({ a: 1, b: 2, c: 3 }, { b: 4 }), { a: 1, b: 4, c: 3 }, 'number ← number');
	t.deepEqual(assignDefaults({ a: 1, b: 2, c: 3 }, { b: null }), { a: 1, b: null, c: 3 }, 'number ← null');
	t.deepEqual(assignDefaults({ a: 1, b: 2, c: 3 }, { b: undefined }), { a: 1, b: 2, c: 3 }, 'number ← undefined');
	t.deepEqual(assignDefaults({ a: 1, b: null, c: 3 }, { b: 2 }), { a: 1, b: 2, c: 3 }, 'null ← number');
	t.deepEqual(assignDefaults({ a: 1, b: undefined, c: 3 }, { b: 2 }), { a: 1, b: 2, c: 3 }, 'undefined ← number');
	t.deepEqual(assignDefaults({ a: { ok: false } }, { a: { ok: true } }), { a: { ok: true } }, 'object ← object');
	t.deepEqual(assignDefaults({ a: 'hello' }, {}), { a: 'hello' }, 'string ← empty');
});

test('getGLPrimitiveCount', async (t) => {
	const doc = new Document();

	const indices = doc.createAccessor().setArray(new Uint16Array(6));
	const position = doc.createAccessor().setType(Accessor.Type.VEC3).setArray(new Float32Array(99));
	const prim = doc.createPrimitive().setMode(Primitive.Mode.TRIANGLES).setAttribute('POSITION', position);
	const indexedPrim = prim.clone().setIndices(indices);

	prim.setMode(Primitive.Mode.POINTS);
	indexedPrim.setMode(Primitive.Mode.POINTS);
	t.is(getGLPrimitiveCount(prim), 33, 'points');
	t.is(getGLPrimitiveCount(indexedPrim), 6, 'points (indexed)');

	prim.setMode(Primitive.Mode.LINES);
	indexedPrim.setMode(Primitive.Mode.LINES);
	t.is(getGLPrimitiveCount(prim), 33 / 2, 'lines');
	t.is(getGLPrimitiveCount(indexedPrim), 3, 'lines (indexed)');

	prim.setMode(Primitive.Mode.LINE_STRIP);
	indexedPrim.setMode(Primitive.Mode.LINE_STRIP);
	t.is(getGLPrimitiveCount(prim), 32, 'line strip');
	t.is(getGLPrimitiveCount(indexedPrim), 5, 'line strip (indexed)');

	prim.setMode(Primitive.Mode.LINE_LOOP);
	indexedPrim.setMode(Primitive.Mode.LINE_LOOP);
	t.is(getGLPrimitiveCount(prim), 33, 'line loop');
	t.is(getGLPrimitiveCount(indexedPrim), 6, 'line loop (indexed)');

	prim.setMode(Primitive.Mode.TRIANGLES);
	indexedPrim.setMode(Primitive.Mode.TRIANGLES);
	t.is(getGLPrimitiveCount(prim), 11, 'triangles');
	t.is(getGLPrimitiveCount(indexedPrim), 2, 'triangles (indexed)');

	prim.setMode(Primitive.Mode.TRIANGLE_FAN);
	indexedPrim.setMode(Primitive.Mode.TRIANGLE_FAN);
	t.is(getGLPrimitiveCount(prim), 31, 'triangle strip');
	t.is(getGLPrimitiveCount(indexedPrim), 4, 'triangle strip (indexed)');

	prim.setMode(Primitive.Mode.TRIANGLE_STRIP);
	indexedPrim.setMode(Primitive.Mode.TRIANGLE_STRIP);
	t.is(getGLPrimitiveCount(prim), 31, 'triangle fan');
	t.is(getGLPrimitiveCount(indexedPrim), 4, 'triangle fan (indexed)');

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
