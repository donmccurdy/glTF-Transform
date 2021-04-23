require('source-map-support').install();

import test from 'tape';
import { Accessor, Document, GLTF, Primitive } from '@gltf-transform/core';
import { quantize } from '../';

const {VEC2, VEC3, VEC4} = Accessor.Type;

test('@gltf-transform/lib::quantize | exclusions', async t => {
	const doc = new Document();
	const uv = createFloatAttribute(doc, 'TEXCOORD_0', Accessor.Type.VEC2, new Float32Array([
		0.00, 0.00,
		1.00, 1.00,
	]));
	const normal = createFloatAttribute(doc, 'NORMAL', Accessor.Type.VEC3, new Float32Array([
		0.00, 0.00, 1.00,
		0.70, 0.70, 0.00,
	]));

	await doc.transform(quantize({excludeAttributes: ['TEXCOORD_0', 'NORMAL']}));

	t.ok(uv.getArray() instanceof Float32Array, 'uv → unchanged');
	t.ok(normal.getArray() instanceof Float32Array, 'normal → unchanged');

	await doc.transform(quantize());

	t.ok(uv.getArray() instanceof Uint16Array, 'uv → Uint16Array');
	t.ok(normal.getArray() instanceof Int16Array, 'normal → Int16Array');
	t.end();
});

test('@gltf-transform/lib::quantize | position', async t => {
	const doc = new Document();
	const OX = 200000, OY = 500000, OZ = 0; // intentionally outside uint16 range.
	const position = createFloatAttribute(doc, 'POSITION', VEC3, new Float32Array([
		// 256x256x256 box; origin <200000, 500000, 0>.
		OX + 0, OY + 0, OZ + 0,
		OX + 256, OY + 0, OZ + 0,
		OX + 0, OY + 256, OZ + 0,
		OX + 0, OY + 0, OZ + 256,
		OX + 0, OY + 256, OZ + 256,
		OX + 256, OY + 0, OZ + 256,
		OX + 256, OY + 256, OZ + 0,
		OX + 256, OY + 256, OZ + 256,
	]));
	const positionCopy = position.clone();
	const mesh = doc.getRoot().listMeshes()[0];
	const node = doc.createNode().setMesh(mesh);

	await doc.transform(quantize({quantizePosition: 14}));

	if (positionCopy.getNormalized() || !(positionCopy.getArray() instanceof Float32Array)) {
		t.fail('Backup copy of positions was modified');
	}

	const expectedRemap = (v: number[]): number[] => [
		(v[0] - OX - 128) / 128, (v[1] - OY - 128) / 128, (v[2] - OZ - 128) / 128
	];

	t.ok(position.getNormalized(), 'position → normalized');
	t.ok(position.getArray() instanceof Int16Array, 'position → Int16Array');
	t.deepEquals(node.getTranslation(), [OX + 128, OY + 128, OZ + 128], 'node offset');
	t.deepEquals(node.getScale(), [128, 128, 128], 'node scale');
	elementPairs(position, positionCopy, round(6))
		.map(([a, b]) => [a, expectedRemap(b)])
		.forEach(([a, b], i) => t.deepEquals(a, b, `position value #${i + 1}`));
	t.end();
});

test('@gltf-transform/lib::quantize | texcoord', async t => {
	const doc = new Document();
	const uv = createFloatAttribute(doc, 'TEXCOORD_0', VEC2, new Float32Array([
		0.00, 0.00,
		0.50, 0.50,
		0.75, 0.25,
		1.00, 0.00,
		1.00, 1.00,
		0.01, 0.99,
	]));
	const uvCopy = uv.clone();

	await doc.transform(quantize({quantizeTexcoord: 12}));

	if (uvCopy.getNormalized() || !(uvCopy.getArray() instanceof Float32Array)) {
		t.fail('Backup copy of UVs was modified');
	}

	t.ok(uv.getNormalized(), 'uv → normalized');
	t.ok(uv.getArray() instanceof Uint16Array, 'uv → Uint16Array');
	elementPairs(uv, uvCopy, round(3))
		.forEach(([a, b], i) => t.deepEquals(a, b, `uv value #${i + 1}`));
	t.end();
});

test('@gltf-transform/lib::quantize | normal', async t => {
	const doc = new Document();
	const normal = createFloatAttribute(doc, 'NORMAL', VEC3, new Float32Array([
		-0.19211, -0.93457, 0.29946,
		-0.08526, -0.99393, 0.06957,
		0.82905, -0.39715, 0.39364,
		0.37303, -0.68174, 0.62934,
		-0.06048, 0.04752, 0.99704,
	]));
	const normalCopy = normal.clone();

	await doc.transform(quantize({quantizeNormal: 12}));

	if (normalCopy.getNormalized() || !(normalCopy.getArray() instanceof Float32Array)) {
		t.fail('Backup copy of normals was modified');
	}

	t.ok(normal.getNormalized(), 'normal → normalized');
	t.ok(normal.getArray() instanceof Int16Array, 'normal → Int16Array');
	elementPairs(normal, normalCopy, round(2))
		.forEach(([a, b], i) => t.deepEquals(a, b, `normal value #${i + 1}`));
	t.end();
});

test('@gltf-transform/lib::quantize | tangent', async t => {
	const doc = new Document();
	const tangent = createFloatAttribute(doc, 'TANGENT', VEC4, new Float32Array([
		-0.19211, -0.93457, 0.29946, 1.0,
		-0.08526, -0.99393, 0.06957, -1.0,
		0.82905, -0.39715, 0.39364, 1.0,
		0.37303, -0.68174, 0.62934, 1.0,
		-0.06048, 0.04752, 0.99704, -1.0
	]));
	const tangentCopy = tangent.clone();

	await doc.transform(quantize({quantizeNormal: 12}));

	if (tangentCopy.getNormalized() || !(tangentCopy.getArray() instanceof Float32Array)) {
		t.fail('Backup copy of tangents was modified');
	}

	t.ok(tangent.getNormalized(), 'tangent → normalized');
	t.ok(tangent.getArray() instanceof Int16Array, 'tangent → Int16Array');
	elementPairs(tangent, tangentCopy, round(2))
		.forEach(([a, b], i) => t.deepEquals(a, b, `tangent value #${i + 1}`));
	t.end();
});

test('@gltf-transform/lib::quantize | color', async t => {
	const doc = new Document();
	const color = createFloatAttribute(doc, 'COLOR_0', VEC3, new Float32Array([
		0.19, 0.93, 0.29,
		0.08, 0.99, 0.06,
		0.82, 0.39, 0.39,
		0.37, 0.68, 0.62,
		0.06, 0.04, 0.99,
	]));
	const colorCopy = color.clone();

	await doc.transform(quantize({quantizeColor: 8}));

	if (colorCopy.getNormalized() || !(colorCopy.getArray() instanceof Float32Array)) {
		t.fail('Backup copy of colors was modified');
	}

	t.ok(color.getNormalized(), 'color → normalized');
	t.ok(color.getArray() instanceof Uint8Array, 'color → Uint8Array');
	elementPairs(color, colorCopy, round(1))
		.forEach(([a, b], i) => t.deepEquals(a, b, `color value #${i + 1}`));
	t.end();
});

// TODO(feat): Apply node transform to IBM?
test.skip('@gltf-transform/lib::quantize | skinning', async t => {
	const doc = new Document();
	const joints = createFloatAttribute(doc, 'JOINTS_0', VEC4, new Float32Array([
		0, 0, 0, 0,
		1, 0, 0, 0,
		2, 0, 0, 0,
		3, 0, 0, 0,
	]));
	const jointsCopy = joints.clone();
	const weights = createFloatAttribute(doc, 'WEIGHTS_0', VEC4, new Float32Array([
		1, 0, 0, 0,
		1, 0, 0, 0,
		1, 0, 0, 0,
		1, 0, 0, 0,
	]));
	const weightsCopy = weights.clone();

	await doc.transform(quantize({quantizeWeight: 10}));

	if (jointsCopy.getNormalized() || !(jointsCopy.getArray() instanceof Float32Array)) {
		t.fail('Backup copy of joints was modified');
	}
	if (weightsCopy.getNormalized() || !(weightsCopy.getArray() instanceof Float32Array)) {
		t.fail('Backup copy of weights was modified');
	}

	t.notOk(joints.getNormalized(), 'joints → normalized');
	t.ok(joints.getArray() instanceof Uint8Array, 'joints → Uint8Array');
	elementPairs(joints, jointsCopy, round(6))
		.forEach(([a, b], i) => t.deepEquals(a, b, `joints value #${i + 1}`));
	t.ok(weights.getNormalized(), 'weights → normalized');
	t.ok(weights.getArray() instanceof Uint16Array, 'weights → Uint16Array');
	elementPairs(weights, weightsCopy, round(6))
		.forEach(([a, b], i) => t.deepEquals(a, b, `weights value #${i + 1}`));
	t.end();
});

test('@gltf-transform/lib::quantize | custom', async t => {
	const doc = new Document();
	const temp = createFloatAttribute(doc, '_TEMPERATURE', VEC3, new Float32Array([
		0.19, 0.93, 0.29,
		0.08, 0.99, 0.06,
		0.82, 0.39, 0.39,
		0.37, 0.68, 0.62,
		0.06, 0.04, 0.99,
	]));
	const tempCopy = temp.clone();

	await doc.transform(quantize({quantizeGeneric: 10}));

	if (tempCopy.getNormalized() || !(tempCopy.getArray() instanceof Float32Array)) {
		t.fail('Backup copy of custom attribute was modified');
	}

	t.ok(temp.getNormalized(), 'custom → normalized');
	t.ok(temp.getArray() instanceof Uint16Array, 'custom → Uint16Array');
	elementPairs(temp, tempCopy, round(3))
		.forEach(([a, b], i) => t.deepEquals(a, b, `custom value #${i + 1}`));
	t.end();
});

test('@gltf-transform/lib::quantize | indices', async t => {
	const doc = new Document();
	createFloatAttribute(doc, 'POSITION', VEC2, new Float32Array([
		0.00, 0.00, 0.50, 0.50, 0.75, 0.25,
	]));
	const indices = doc.createAccessor()
		.setType('SCALAR')
		.setArray(new Uint32Array([0, 1, 2, 3, 4, 5, 6, 7]));
	const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
	prim.setIndices(indices);
	const indicesCopy = indices.clone();

	await doc.transform(quantize());

	if (indicesCopy.getNormalized() || !(indicesCopy.getArray() instanceof Uint32Array)) {
		t.fail('Backup copy of indices was modified');
	}

	t.notOk(indices.getNormalized(), 'indices → not normalized');
	t.ok(indices.getArray() instanceof Uint16Array, 'indices → Uint16Array');
	elementPairs(indices, indicesCopy, round(8))
		.forEach(([a, b], i) => t.deepEquals(a, b, `indices value #${i + 1}`));
	t.end();
});

/* UTILITIES */

/** Creates a rounding function for given decimal precision. */
function round (decimals: number): (v: number) => number {
	const f = Math.pow(10, decimals);
	return (v: number) => Math.round(v * f) / f;
}

/** Returns an array of pairs, containing the aligned elements for each of two Accessors. */
function elementPairs (a: Accessor, b: Accessor, roundFn: (v: number) => number): number[][][] {
	const pairs = [];
	for (let i = 0, il = a.getCount(); i < il; i++) {
		pairs.push([
			a.getElement(i, []).map(roundFn),
			b.getElement(i, []).map(roundFn),
		]);
	}
	return pairs;
}

/** Builds a new float32 attribute for given type and data. */
function createFloatAttribute(
		doc: Document,
		semantic: string,
		type: GLTF.AccessorType,
		array: Float32Array): Accessor {
	const attribute = doc.createAccessor()
		.setType(type)
		.setArray(array);
	const prim = doc.createPrimitive()
		.setAttribute(semantic, attribute)
		.setMode(Primitive.Mode.TRIANGLES);
	doc.createMesh().addPrimitive(prim);
	return attribute;
}
