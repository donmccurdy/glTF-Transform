import test from 'ava';
import fs from 'fs/promises';
import path, { dirname } from 'path';
import { Document, Logger, Primitive } from '@gltf-transform/core';
import { weld } from '@gltf-transform/functions';
import { fileURLToPath } from 'url';

const LOGGER = new Logger(Logger.Verbosity.SILENT);

const __dirname = dirname(fileURLToPath(import.meta.url));

test('tolerance=0', async (t) => {
	const doc = new Document().setLogger(LOGGER);
	const positionArray = new Float32Array([0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0, -1]);
	const position = doc.createAccessor().setType('VEC3').setArray(positionArray);
	const indices = doc.createAccessor().setArray(new Uint32Array([3, 4, 5, 0, 1, 2]));
	const prim1 = doc.createPrimitive().setAttribute('POSITION', position).setMode(Primitive.Mode.TRIANGLES);
	const prim2 = doc
		.createPrimitive()
		.setIndices(indices)
		.setAttribute('POSITION', position)
		.setMode(Primitive.Mode.TRIANGLES);
	doc.createMesh().addPrimitive(prim1).addPrimitive(prim2);

	await doc.transform(weld({ tolerance: 0 }));

	t.deepEqual(prim1.getIndices().getArray(), new Uint16Array([0, 1, 2, 3, 4, 5]), 'indices on prim1');
	t.deepEqual(prim2.getIndices().getArray(), new Uint32Array([3, 4, 5, 0, 1, 2]), 'indices on prim2');
	t.deepEqual(prim1.getAttribute('POSITION').getArray(), positionArray, 'vertices on prim1');
	t.deepEqual(prim2.getAttribute('POSITION').getArray(), positionArray, 'vertices on prim2');
});

test('tolerance>0', async (t) => {
	const doc = new Document().setLogger(LOGGER);
	// prettier-ignore
	const positionArray = new Float32Array([
		0, 0, 0,
		0, 0, 1,
		0, 0, -1,
		0, 0, 0,
		0, 0, 1,
		0, 0, -1
	]);
	// prettier-ignore
	const normalArray = new Float32Array([
		0, 0, 1,
		0, 0.5, 0.5,
		0.5, 0.5, 0,
		0, 0, 1,
		0, 0.5, 0.50001, // should still be welded
		0.5, 0.5, 0
	]);
	const position = doc.createAccessor().setType('VEC3').setArray(positionArray);
	const normal = doc.createAccessor().setType('VEC3').setArray(normalArray);

	const prim1 = doc
		.createPrimitive()
		.setMode(Primitive.Mode.TRIANGLES)
		.setAttribute('POSITION', position)
		.setAttribute('NORMAL', normal);

	const prim2Indices = doc.createAccessor().setArray(new Uint32Array([3, 4, 5, 0, 1, 2]));
	const prim2 = doc
		.createPrimitive()
		.setMode(Primitive.Mode.TRIANGLES)
		.setIndices(prim2Indices)
		.setAttribute('POSITION', position)
		.setAttribute('NORMAL', normal);
	doc.createMesh().addPrimitive(prim1).addPrimitive(prim2);

	await doc.transform(weld());

	t.deepEqual(prim1.getIndices().getArray(), new Uint16Array([0, 1, 2, 0, 1, 2]), 'indices on prim1');
	t.deepEqual(prim2.getIndices().getArray(), new Uint16Array([0, 1, 2, 0, 1, 2]), 'indices on prim2');
	t.deepEqual(prim1.getAttribute('POSITION').getArray(), positionArray.slice(0, 9), 'vertices on prim1');
	t.deepEqual(prim2.getAttribute('POSITION').getArray(), positionArray.slice(0, 9), 'vertices on prim2');
	t.is(doc.getRoot().listAccessors().length, 3, 'accessor count');
});

test('attributes', async (t) => {
	const doc = new Document().setLogger(LOGGER);
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
		0, 63, 64,
		63, 0, 63,
		63, 63, 0,
		0, 62, 63,
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

	await doc.transform(weld({ tolerance: 0.0001 }));

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
			0, 63, 64,
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
	const doc = new Document().setLogger(LOGGER);
	const smArray = new Float32Array(65534 * 3);
	const lgArray = new Float32Array(65535 * 3);
	const smPosition = doc.createAccessor().setType('VEC3').setArray(smArray);
	const lgPosition = doc.createAccessor().setType('VEC3').setArray(lgArray);
	const smPrim = doc.createPrimitive().setAttribute('POSITION', smPosition).setMode(Primitive.Mode.TRIANGLES);
	const lgPrim = doc.createPrimitive().setAttribute('POSITION', lgPosition).setMode(Primitive.Mode.TRIANGLES);
	doc.createMesh().addPrimitive(smPrim).addPrimitive(lgPrim);

	await doc.transform(weld({ tolerance: 0 }));

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
		const document = new Document().setLogger(LOGGER);
		const position = document
			.createAccessor()
			.setArray(new Float32Array(primDef.attributes.POSITION))
			.setType('VEC3');
		const prim = document.createPrimitive().setMode(primDef.mode).setAttribute('POSITION', position);
		document.createMesh().addPrimitive(prim);

		await document.transform(weld({ tolerance: 0 }));

		t.deepEqual(
			Array.from(primDef.indices),
			Array.from(prim.getIndices().getArray()),
			`${(i + 1).toString().padStart(2, '0')}: indices ${Array.from(primDef.indices)}`
		);
	}
});

test('targets', async (t) => {
	const document = new Document().setLogger(LOGGER);
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
		'target positions'
	);
	t.is(document.getRoot().listAccessors().length, 3, 'accessor count');
});

test('degenerate', async (t) => {
	const doc = new Document().setLogger(LOGGER);
	// prettier-ignore
	const positionArray = new Float32Array([
		0, 0, 0,
		0, 0, 1,
		0, 0, -1,
		0, 0, 0,
		0, 0, 0.00000001,
		0, 0, -0.00000001,
	]);
	const position = doc.createAccessor().setType('VEC3').setArray(positionArray);
	const prim = doc.createPrimitive().setAttribute('POSITION', position).setMode(Primitive.Mode.TRIANGLES);

	doc.createMesh().addPrimitive(prim);

	await doc.transform(weld({ tolerance: 0.00001, exhaustive: false }));

	t.deepEqual(prim.getIndices().getArray(), new Uint16Array([0, 1, 2]), 'indices on prim');
	t.deepEqual(
		Array.from(prim.getAttribute('POSITION').getArray()),
		// prettier-ignore
		[
			0, 0, 0,
			0, 0, 1,
			0, 0, -1
		],
		'vertices on prim'
	);
});
