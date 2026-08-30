import { deepEqual, fail, ok, strictEqual, throws } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Accessor, Document, type GLTF, Primitive, type Transform, type TransformContext } from '@gltf-transform/core';
import { assignDefaults, createTransform, getGLPrimitiveCount, isTransformPending } from '@gltf-transform/functions';

describe('functions::utils', () => {
	test('assignDefaults', () => {
		deepEqual(assignDefaults({ a: 1, b: 2, c: 3 }, { b: 4 }), { a: 1, b: 4, c: 3 }, 'number ← number');
		deepEqual(assignDefaults({ a: 1, b: 2, c: 3 }, { b: null }), { a: 1, b: null, c: 3 }, 'number ← null');
		deepEqual(assignDefaults({ a: 1, b: 2, c: 3 }, { b: undefined }), { a: 1, b: 2, c: 3 }, 'number ← undefined');
		deepEqual(assignDefaults({ a: 1, b: null, c: 3 }, { b: 2 }), { a: 1, b: 2, c: 3 }, 'null ← number');
		deepEqual(assignDefaults({ a: 1, b: undefined, c: 3 }, { b: 2 }), { a: 1, b: 2, c: 3 }, 'undefined ← number');
		deepEqual(assignDefaults({ a: { ok: false } }, { a: { ok: true } }), { a: { ok: true } }, 'object ← object');
		deepEqual(assignDefaults({ a: 'hello' }, {}), { a: 'hello' }, 'string ← empty');
	});

	test('getGLPrimitiveCount', async () => {
		const doc = new Document();

		const indices = doc.createAccessor().setArray(new Uint16Array(6));
		const position = doc.createAccessor().setType(Accessor.Type.VEC3).setArray(new Float32Array(99));
		const prim = doc.createPrimitive().setMode(Primitive.Mode.TRIANGLES).setAttribute('POSITION', position);
		const indexedPrim = prim.clone().setIndices(indices);

		prim.setMode(Primitive.Mode.POINTS);
		indexedPrim.setMode(Primitive.Mode.POINTS);
		strictEqual(getGLPrimitiveCount(prim), 33, 'points');
		strictEqual(getGLPrimitiveCount(indexedPrim), 6, 'points (indexed)');

		prim.setMode(Primitive.Mode.LINES);
		indexedPrim.setMode(Primitive.Mode.LINES);
		strictEqual(getGLPrimitiveCount(prim), 33 / 2, 'lines');
		strictEqual(getGLPrimitiveCount(indexedPrim), 3, 'lines (indexed)');

		prim.setMode(Primitive.Mode.LINE_STRIP);
		indexedPrim.setMode(Primitive.Mode.LINE_STRIP);
		strictEqual(getGLPrimitiveCount(prim), 32, 'line strip');
		strictEqual(getGLPrimitiveCount(indexedPrim), 5, 'line strip (indexed)');

		prim.setMode(Primitive.Mode.LINE_LOOP);
		indexedPrim.setMode(Primitive.Mode.LINE_LOOP);
		strictEqual(getGLPrimitiveCount(prim), 33, 'line loop');
		strictEqual(getGLPrimitiveCount(indexedPrim), 6, 'line loop (indexed)');

		prim.setMode(Primitive.Mode.TRIANGLES);
		indexedPrim.setMode(Primitive.Mode.TRIANGLES);
		strictEqual(getGLPrimitiveCount(prim), 11, 'triangles');
		strictEqual(getGLPrimitiveCount(indexedPrim), 2, 'triangles (indexed)');

		prim.setMode(Primitive.Mode.TRIANGLE_FAN);
		indexedPrim.setMode(Primitive.Mode.TRIANGLE_FAN);
		strictEqual(getGLPrimitiveCount(prim), 31, 'triangle strip');
		strictEqual(getGLPrimitiveCount(indexedPrim), 4, 'triangle strip (indexed)');

		prim.setMode(Primitive.Mode.TRIANGLE_STRIP);
		indexedPrim.setMode(Primitive.Mode.TRIANGLE_STRIP);
		strictEqual(getGLPrimitiveCount(prim), 31, 'triangle fan');
		strictEqual(getGLPrimitiveCount(indexedPrim), 4, 'triangle fan (indexed)');

		prim.setMode('TEST' as unknown as GLTF.MeshPrimitiveMode);
		throws(() => getGLPrimitiveCount(prim), { message: /mode/i }, 'invalid');
	});

	test('transform pipeline', async () => {
		const doc = new Document();
		const first = createTransform('first', (_: Document, context?: TransformContext) => {
			if (!isTransformPending(context, 'first', 'second')) {
				throw new Error('Out of order!');
			}
		});
		const second: Transform = (_: Document) => undefined;

		ok(doc.transform(first, second), '[a, b] OK');

		try {
			await doc.transform(second, first);
			fail('[b, a] NOT OK');
		} catch (e) {
			ok(/out of order/i.test((e as Error).message), '[b, a] NOT OK');
		}
	});
});
