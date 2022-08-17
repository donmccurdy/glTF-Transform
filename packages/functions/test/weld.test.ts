require('source-map-support').install();

import test from 'tape';
import fs from 'fs/promises';
import path from 'path';
import { Accessor, Document, Logger, Primitive } from '@gltf-transform/core';
import { weld } from '../';

const LOGGER = new Logger(Logger.Verbosity.SILENT);

test('@gltf-transform/functions::weld | tolerance=0', async (t) => {
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

	t.deepEquals(prim1.getIndices().getArray(), new Uint16Array([0, 1, 2, 3, 4, 5]), 'indices on prim1');
	t.deepEquals(prim2.getIndices().getArray(), new Uint32Array([3, 4, 5, 0, 1, 2]), 'indices on prim2');
	t.deepEquals(prim1.getAttribute('POSITION').getArray(), positionArray, 'vertices on prim1');
	t.deepEquals(prim2.getAttribute('POSITION').getArray(), positionArray, 'vertices on prim2');
	t.end();
});

test('@gltf-transform/functions::weld | tolerance>0', async (t) => {
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
	// prettier-ignore
	const positionTargetArray = new Float32Array([
		0, 10, 0,
		0, 10, 1,
		0, 10, -1,
		0, 15, 0,
		0, 15, 1,
		0, 15, -1
	]);
	const position = doc.createAccessor().setType('VEC3').setArray(positionArray);
	const normal = doc.createAccessor().setType('VEC3').setArray(normalArray);
	const positionTarget = doc.createAccessor().setType('VEC3').setArray(positionTargetArray);

	const prim1 = doc
		.createPrimitive()
		.setMode(Primitive.Mode.TRIANGLES)
		.setAttribute('POSITION', position)
		.setAttribute('NORMAL', normal);

	const prim2Indices = doc.createAccessor().setArray(new Uint32Array([3, 4, 5, 0, 1, 2]));
	const prim2Target = doc.createPrimitiveTarget().setAttribute('POSITION', positionTarget);
	const prim2 = doc
		.createPrimitive()
		.setMode(Primitive.Mode.TRIANGLES)
		.setIndices(prim2Indices)
		.setAttribute('POSITION', position)
		.setAttribute('NORMAL', normal)
		.addTarget(prim2Target);
	doc.createMesh().addPrimitive(prim1).addPrimitive(prim2);

	await doc.transform(weld());

	t.deepEquals(prim1.getIndices().getArray(), new Uint16Array([0, 1, 2, 0, 1, 2]), 'indices on prim1');
	t.deepEquals(prim2.getIndices().getArray(), new Uint16Array([0, 1, 2, 0, 1, 2]), 'indices on prim2');
	t.deepEquals(prim1.getAttribute('POSITION').getArray(), positionArray.slice(0, 9), 'vertices on prim1');
	t.deepEquals(prim2.getAttribute('POSITION').getArray(), positionArray.slice(0, 9), 'vertices on prim2');
	t.deepEquals(
		prim2.listTargets()[0].getAttribute('POSITION').getArray(),
		positionTargetArray.slice(0, 9), // Uses later targets, because of index order.
		'morph targets on prim2'
	);
	t.equals(doc.getRoot().listAccessors().length, 4, 'keeps only needed accessors');
	t.end();
});

test('@gltf-transform/functions::weld | attributes', async (t) => {
	const doc = new Document().setLogger(LOGGER);
	// prettier-ignore
	const positionArray = new Uint8Array([
		0, 0, 0, // ⎡
		0, 0, 0, // ⎢ all match, weld 3
		0, 0, 0, // ⎣
		1, 0, 0, // ⎡
		1, 0, 0, // ⎢ normals differ, weld 2
		1, 0, 0, // ⎣ ❌
		0, 1, 1, // ⎡ ❌
		0, 1, 1, // ⎢ colors differ, weld 2
		0, 1, 1, // ⎣
	]);
	// prettier-ignore
	const normalArray = new Int8Array([
		63, 63, 0,
		63, 63, 0,
		63, 63, 0,
		0, 63, 64,
		0, 62, 63,
		0, -63, 63, // ❌
		63, 0, 63,
		63, 0, 63,
		63, 0, 63,
	]);
	// prettier-ignore
	const colorArray = new Uint8Array([
		255, 0, 0, 1,
		255, 0, 0, 1,
		255, 0, 0, 1,
		0, 255, 0, 1,
		0, 255, 0, 1,
		0, 255, 0, 1,
		0, 0, 200, 1, // ❌
		0, 0, 255, 1,
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

	// prettier-ignore
	t.deepEquals(
		Array.from(prim.getIndices()!.getArray()!),
		[
			0, 0, 0,
			3, 3, 4,
			1, 2, 2,
		],
		'indices'
	);
	// prettier-ignore
	t.deepEquals(
		Array.from(prim.getAttribute('POSITION')!.getArray()!),
		[
			0, 0, 0,
			0, 1, 1,
			0, 1, 1,
			1, 0, 0,
			1, 0, 0,
		],
		'position'
	);
	// prettier-ignore
	t.deepEquals(
		Array.from(prim.getAttribute('NORMAL')!.getArray()!),
		[
			63, 63, 0,
			63, 0, 63,
			63, 0, 63,
			0, 63, 64,
			0, -63, 63,
		],
		'normal'
	);
	// prettier-ignore
	t.deepEquals(
		Array.from(prim.getAttribute('COLOR_0')!.getArray()!),
		[
			255, 0, 0, 1,
			0, 0, 200, 1,
			0, 0, 255, 1,
			0, 255, 0, 1,
			0, 255, 0, 1,
		],
		'color'
	);
	t.end();
});

test('@gltf-transform/functions::weld | u16 vs u32', async (t) => {
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
	t.equals(smPrim.getIndices().getArray().constructor, Uint16Array, 'u16 <= 65534');
	t.equals(lgPrim.getIndices().getArray().constructor, Uint32Array, 'u32 > 65534');
	t.end();
});

test('@gltf-transform/functions::weld | modes', async (t) => {
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

		t.deepEquals(
			Array.from(primDef.indices),
			Array.from(prim.getIndices().getArray()),
			`${(i + 1).toString().padStart(2, '0')}: indices ${Array.from(primDef.indices)}`
		);
	}
	t.end();
});
