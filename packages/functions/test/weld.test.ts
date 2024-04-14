import test from 'ava';
import fs from 'fs/promises';
import path, { dirname } from 'path';
import { Accessor, Document, GLTF, Primitive, getBounds } from '@gltf-transform/core';
import { weld } from '@gltf-transform/functions';
import { logger } from '@gltf-transform/test-utils';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('tolerance=0', async (t) => {
	const doc = new Document().setLogger(logger);
	// prettier-ignore
	const positionArray = new Float32Array([
		0, 0, 0,
		0, 0, 1,
		0, 0, -1,
		0, 0, 0,
		0, 0, 1,
		0, 0, -1
	]);
	const position = doc.createAccessor().setType('VEC3').setArray(positionArray);
	const indices = doc.createAccessor().setArray(new Uint32Array([3, 4, 5, 0, 1, 2]));
	const prim1 = doc.createPrimitive().setAttribute('POSITION', position).setMode(Primitive.Mode.TRIANGLES);
	const prim2 = doc
		.createPrimitive()
		.setIndices(indices)
		.setAttribute('POSITION', position)
		.setMode(Primitive.Mode.TRIANGLES);
	doc.createMesh().addPrimitive(prim1).addPrimitive(prim2);

	await doc.transform(weld({ overwrite: false }));

	t.true(prim1.getIndices().getArray() instanceof Uint16Array, 'indices are u16');
	t.deepEqual(Array.from(prim1.getIndices().getArray()), [0, 1, 2, 0, 1, 2], 'indices on prim1');
	t.deepEqual(Array.from(prim2.getIndices().getArray()), [3, 4, 5, 0, 1, 2], 'indices on prim2');
	t.deepEqual(
		Array.from(prim1.getAttribute('POSITION').getArray()),
		[0, 0, 0, 0, 0, 1, 0, 0, -1],
		'vertices on prim1',
	);
	t.deepEqual(prim2.getAttribute('POSITION').getArray(), positionArray, 'vertices on prim2');
});

test('attributes', async (t) => {
	const doc = new Document().setLogger(logger);
	// prettier-ignore
	const positionArray = new Uint8Array([
		0, 0, 0, // A: All A's match, weld 3
		1, 0, 0, // B: Normals differ, weld 2 B's
		0, 1, 1, // C: ❌ Colors differ, weld 2 C's
		0, 0, 0, // A:
		1, 0, 0, // B:
		0, 1, 1, // C:
		0, 0, 0, // A:
		1, 0, 0, // B: ❌
		0, 1, 1, // C:
	]);
	// prettier-ignore
	const normalArray = new Int8Array([
		63, 63, 0,
		0, 63, 63,
		63, 0, 63,
		63, 63, 0,
		0, 63, 63,
		63, 0, 63,
		63, 63, 0,
		0, -63, 63, // ❌
		63, 0, 63,
	]);
	// prettier-ignore
	const colorArray = new Uint8Array([
		255, 0, 0, 1,
		0, 255, 0, 1,
		0, 0, 200, 1, // ❌
		255, 0, 0, 1,
		0, 255, 0, 1,
		0, 0, 255, 1,
		255, 0, 0, 1,
		0, 255, 0, 1,
		0, 0, 255, 1,
	]);
	const position = doc.createAccessor().setType('VEC3').setArray(positionArray);
	const normal = doc.createAccessor().setType('VEC3').setArray(normalArray).setNormalized(true);
	const color = doc.createAccessor().setType('VEC4').setArray(colorArray).setNormalized(true);
	const prim = doc
		.createPrimitive()
		.setMode(Primitive.Mode.TRIANGLES)
		.setAttribute('POSITION', position)
		.setAttribute('NORMAL', normal)
		.setAttribute('COLOR_0', color);
	doc.createMesh().addPrimitive(prim);

	await doc.transform(weld());

	t.false(prim.isDisposed(), 'prim is not disposed');
	// prettier-ignore
	t.deepEqual(
		Array.from(prim.getIndices()!.getArray()!),
		[
			0, 1, 2,
			0, 1, 3,
			0, 4, 3
		],
		'indices'
	);

	// prettier-ignore
	t.deepEqual(
		Array.from(prim.getAttribute('POSITION')!.getArray()!),
		[
			0, 0, 0,
			1, 0, 0,
			0, 1, 1,
			0, 1, 1,
			1, 0, 0
		],
		'position'
	);
	// prettier-ignore
	t.deepEqual(
		Array.from(prim.getAttribute('NORMAL')!.getArray()!),
		[
			63, 63, 0,
			0, 63, 63,
			63, 0, 63,
			63, 0, 63,
			0, -63, 63
		],
		'normal'
	);
	// prettier-ignore
	t.deepEqual(
		Array.from(prim.getAttribute('COLOR_0')!.getArray()!),
		[
			255, 0, 0, 1,
			0, 255, 0, 1,
			0, 0, 200, 1,
			0, 0, 255, 1,
			0, 255, 0, 1
		],
		'color'
	);
});

test('u16 vs u32', async (t) => {
	const doc = new Document().setLogger(logger);
	const smPrim = doc
		.createPrimitive()
		.setAttribute('POSITION', createUniqueAttribute(doc, 'VEC3', 65534))
		.setMode(Primitive.Mode.TRIANGLES);
	const lgPrim = doc
		.createPrimitive()
		.setAttribute('POSITION', createUniqueAttribute(doc, 'VEC3', 65535))
		.setMode(Primitive.Mode.TRIANGLES);
	doc.createMesh().addPrimitive(smPrim).addPrimitive(lgPrim);

	await doc.transform(weld());

	// 65535 is primitive restart; use 65534 as limit.
	t.is(smPrim.getIndices().getArray().constructor, Uint16Array, 'u16 <= 65534');
	t.is(lgPrim.getIndices().getArray().constructor, Uint32Array, 'u32 > 65534');
});

test('modes', async (t) => {
	// Extracted primitive data from (unindexed) 01–06 samples:
	// https://github.com/KhronosGroup/glTF-Asset-Generator/tree/master/Output/Positive/Mesh_PrimitiveMode
	const datasetPath = path.resolve(__dirname, 'in/Mesh_PrimitiveMode_01_to_06.json');
	const dataset = JSON.parse(await fs.readFile(datasetPath, 'utf-8'));

	for (let i = 0; i < dataset.length; i++) {
		const primDef = dataset[i];
		const document = new Document().setLogger(logger);
		const position = document
			.createAccessor()
			.setArray(new Float32Array(primDef.attributes.POSITION))
			.setType('VEC3');
		const prim = document.createPrimitive().setMode(primDef.mode).setAttribute('POSITION', position);
		const mesh = document.createMesh().addPrimitive(prim);
		const node = document.createNode().setMesh(mesh);
		document.createScene().addChild(node);

		const bboxBefore = getBounds(node);
		await document.transform(weld());
		const bboxAfter = getBounds(node);

		const id = `${(i + 1).toString().padStart(2, '0')}`;
		t.deepEqual(bboxAfter, bboxBefore, `bbox unchanged - ${id}`);
		t.true(prim.getIndices().getCount() <= primDef.indices.length, `indices - ${id}`);
	}
});

test('points', async (t) => {
	const doc = new Document().setLogger(logger);
	const positionArray = new Float32Array([0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0, -1]);
	const position = doc.createAccessor().setType('VEC3').setArray(positionArray);
	const prim = doc.createPrimitive().setAttribute('POSITION', position).setMode(Primitive.Mode.POINTS);
	doc.createMesh().addPrimitive(prim);

	// points can't be welded, but also shouldn't throw an error.
	await doc.transform(weld());

	t.false(prim.isDisposed(), 'prim not disposed');
	t.is(prim.getAttribute('POSITION').getArray().length, positionArray.length, 'prim vertices');
});

test('targets', async (t) => {
	const document = new Document().setLogger(logger);
	// prettier-ignore
	const positionArray = new Float32Array([
		0, 0, 0,
		0, 0, 1,
		0, 0, 2,
		0, 0, 0,
		0, 0, 1,
		0, 0, 2,
		0, 0, 0,
		0, 0, 1,
		0, 0, 2
	]);
	// prettier-ignore
	const positionTargetArray = new Float32Array([
		10, 0, 0, // ✅
		10, 0, 0,
		10, 0, 0,
		10, 0, 0, // ✅
		10, 0, 0,
		10, 0, 0,
		5, 0, 0, // ❌
		5, 0, 0,
		5, 0, 0,
	]);
	const position = document.createAccessor().setType('VEC3').setArray(positionArray);
	const positionTarget = document.createAccessor().setType('VEC3').setArray(positionTargetArray);

	const primTarget = document.createPrimitiveTarget().setAttribute('POSITION', positionTarget);
	const prim = document
		.createPrimitive()
		.setMode(Primitive.Mode.TRIANGLES)
		.setAttribute('POSITION', position)
		.addTarget(primTarget);

	document.createMesh().addPrimitive(prim);

	await document.transform(weld());

	t.deepEqual(prim.getIndices().getArray(), new Uint16Array([0, 1, 2, 0, 1, 2, 3, 4, 5]), 'indices');
	t.deepEqual(prim.getAttribute('POSITION').getArray(), positionArray.slice(9, 27), 'prim positions');
	t.deepEqual(
		prim.listTargets()[0].getAttribute('POSITION').getArray(),
		positionTargetArray.slice(9, 27),
		'target positions',
	);
	t.is(document.getRoot().listAccessors().length, 3, 'accessor count');
});

test('no side effects', async (t) => {
	const document = new Document().setLogger(logger);
	const attributeA = document.createAccessor().setType('VEC3').setArray(new Float32Array(9));
	attributeA.clone();

	await document.transform(weld({ cleanup: false }));

	t.is(document.getRoot().listAccessors().length, 2, 'skips prune and dedup');
});

/* UTILITIES */

function createUniqueAttribute(document: Document, type: GLTF.AccessorType, count: number): Accessor {
	const attribute = document.createAccessor().setType(type);
	const elementSize = attribute.getElementSize();
	const array = new Float32Array(count * elementSize);

	for (let i = 0; i < count; i++) {
		for (let j = 0; j < elementSize; j++) {
			array[i * elementSize + j] = i;
		}
	}

	return attribute.setArray(array);
}
