require('source-map-support').install();

import test from 'tape';
import { Accessor, bbox, bounds, Document, Logger, Primitive, PrimitiveTarget, Scene, vec3 } from '@gltf-transform/core';
import { quantize } from '../';

const logger = new Logger(Logger.Verbosity.WARN);

test('@gltf-transform/functions::quantize | exclusions', async t => {
	const doc = new Document().setLogger(logger);
	const prim = createPrimitive(doc);

	await doc.transform(quantize({excludeAttributes: ['NORMAL', 'TEXCOORD_0']}));

	t.ok(prim.getAttribute('POSITION').getArray() instanceof Int16Array, 'position → Int16Array');
	t.ok(prim.getAttribute('TEXCOORD_0').getArray() instanceof Float32Array, 'uv → unchanged');
	t.ok(prim.getAttribute('NORMAL').getArray() instanceof Float32Array, 'normal → unchanged');

	await doc.transform(quantize());

	t.ok(prim.getAttribute('TEXCOORD_0').getArray() instanceof Uint16Array, 'uv → Uint16Array');
	t.ok(prim.getAttribute('NORMAL').getArray() instanceof Int16Array, 'normal → Int16Array');
	t.end();
});

test('@gltf-transform/functions::quantize | mesh volume', async t => {
	const doc = new Document().setLogger(logger);
	const scene = createScene(doc);
	const nodeA = doc.getRoot().listNodes()[0];
	const nodeB = doc.getRoot().listNodes()[1];
	const primA = doc.getRoot().listMeshes()[0].listPrimitives()[0];
	const primB = doc.getRoot().listMeshes()[1].listPrimitives()[0];

	const bboxSceneCopy = bounds(scene);
	const bboxNodeACopy = bounds(nodeA);
	const bboxNodeBCopy = bounds(nodeB);
	const bboxMeshACopy = primBounds(primA);
	const bboxMeshBCopy = primBounds(primB);

	t.deepEquals(bboxSceneCopy, {min: [0, 0, 0], max: [50, 50, 50]}, 'original bbox - scene');
	t.deepEquals(bboxNodeACopy, {min: [20, 10, 0], max: [25, 15, 0]}, 'original bbox - nodeA');
	t.deepEquals(bboxNodeBCopy, {min: [0, 0, 0], max: [50, 50, 50]}, 'original bbox - nodeB');
	t.deepEquals(bboxMeshACopy, {min: [10, 10, 0], max: [15, 15, 0]}, 'original bbox - meshA');
	t.deepEquals(bboxMeshBCopy, {min: [0, 0, 0], max: [100, 100, 100]}, 'original bbox - meshB');

	await doc.transform(quantize({quantizePosition: 14}));

	const bboxScene = bounds(scene);
	const bboxNodeA = bounds(nodeA);
	const bboxNodeB = bounds(nodeB);
	const bboxMeshA = primBounds(primA);
	const bboxMeshB = primBounds(primB);

	t.deepEquals(bboxScene, {min: [0, 0, 0], max: [50, 50, 50]}, 'bbox - scene');
	t.deepEquals(bboxNodeA, {min: [20, 10, 0], max: [25, 15, 0]}, 'bbox - nodeA');
	t.deepEquals(bboxNodeB, {min: [0, 0, 0], max: [50, 50, 50]}, 'bbox - nodeB');
	t.deepEquals(bboxMeshA, {min: [-1, -1, 0], max: [1, 1, 0]}, 'bbox - meshA');
	t.deepEquals(bboxMeshB, {min: [-1, -1, -1], max: [1, 1, 1]}, 'bbox - meshB');
	t.equals(doc.getRoot().listNodes().length, 2, 'total nodes');
	t.equals(doc.getRoot().listAccessors().length, 2, 'total accessors');
	t.equals(doc.getRoot().listSkins().length, 0, 'total skins');
	t.end();
});

test('@gltf-transform/functions::quantize | scene volume', async t => {
	const doc = new Document().setLogger(logger);
	const scene = createScene(doc);
	const nodeA = doc.getRoot().listNodes()[0];
	const nodeB = doc.getRoot().listNodes()[1];
	const primA = doc.getRoot().listMeshes()[0].listPrimitives()[0];
	const primB = doc.getRoot().listMeshes()[1].listPrimitives()[0];

	const bboxSceneCopy = bounds(scene);
	const bboxNodeACopy = bounds(nodeA);
	const bboxNodeBCopy = bounds(nodeB);
	const bboxMeshACopy = primBounds(primA);
	const bboxMeshBCopy = primBounds(primB);

	t.deepEquals(bboxSceneCopy, {min: [0, 0, 0], max: [50, 50, 50]}, 'original bbox - scene');
	t.deepEquals(bboxNodeACopy, {min: [20, 10, 0], max: [25, 15, 0]}, 'original bbox - nodeA');
	t.deepEquals(bboxNodeBCopy, {min: [0, 0, 0], max: [50, 50, 50]}, 'original bbox - nodeB');
	t.deepEquals(bboxMeshACopy, {min: [10, 10, 0], max: [15, 15, 0]}, 'original bbox - meshA');
	t.deepEquals(bboxMeshBCopy, {min: [0, 0, 0], max: [100, 100, 100]}, 'original bbox - meshB');

	await doc.transform(quantize({
		quantizePosition: 14,
		quantizationVolume: 'scene',
	}));

	const bboxScene = roundBbox(bounds(scene), 3);
	const bboxNodeA = roundBbox(bounds(nodeA), 2);
	const bboxNodeB = roundBbox(bounds(nodeB), 3);
	const bboxMeshA = roundBbox(primBounds(primA), 3);
	const bboxMeshB = roundBbox(primBounds(primB), 3);

	t.deepEquals(bboxScene, {min: [0, 0, 0], max: [50, 50, 50]}, 'bbox - scene');
	t.deepEquals(bboxNodeA, {min: [20, 10, 0], max: [25, 15, 0]}, 'bbox - nodeA');
	t.deepEquals(bboxNodeB, {min: [0, 0, 0], max: [50, 50, 50]}, 'bbox - nodeB');
	t.deepEquals(bboxMeshA, {min: [-.8, -.8, -1], max: [-.7, -.7, -1]}, 'bbox - meshA');
	t.deepEquals(bboxMeshB, {min: [-1, -1, -1], max: [1, 1, 1]}, 'bbox - meshB');
	t.equals(doc.getRoot().listNodes().length, 2, 'total nodes');
	t.equals(doc.getRoot().listAccessors().length, 2, 'total accessors');
	t.equals(doc.getRoot().listSkins().length, 0, 'total skins');
	t.end();
});

test('@gltf-transform/functions::quantize | skinned mesh', async t => {
	const doc = new Document().setLogger(logger);
	const scene = createScene(doc);
	const nodeA = doc.getRoot().listNodes()[0];
	const nodeB = doc.getRoot().listNodes()[1];
	const primA = doc.getRoot().listMeshes()[0].listPrimitives()[0];
	const primB = doc.getRoot().listMeshes()[1].listPrimitives()[0];

	const bboxSceneCopy = bounds(scene);
	const bboxNodeACopy = bounds(nodeA);
	const bboxNodeBCopy = bounds(nodeB);
	const bboxMeshACopy = primBounds(primA);
	const bboxMeshBCopy = primBounds(primB);

	t.deepEquals(bboxSceneCopy, {min: [0, 0, 0], max: [50, 50, 50]}, 'original bbox - scene');
	t.deepEquals(bboxNodeACopy, {min: [20, 10, 0], max: [25, 15, 0]}, 'original bbox - nodeA');
	t.deepEquals(bboxNodeBCopy, {min: [0, 0, 0], max: [50, 50, 50]}, 'original bbox - nodeB');
	t.deepEquals(bboxMeshACopy, {min: [10, 10, 0], max: [15, 15, 0]}, 'original bbox - meshA');
	t.deepEquals(bboxMeshBCopy, {min: [0, 0, 0], max: [100, 100, 100]}, 'original bbox - meshB');

	const ibm = doc.createAccessor()
		.setType('MAT4')
		.setArray(new Float32Array([
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1,
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1,
		]));
	nodeB.setSkin(doc.createSkin().setInverseBindMatrices(ibm));

	await doc.transform(quantize({quantizePosition: 14}));

	const bboxScene = bounds(scene);
	const bboxNodeA = bounds(nodeA);
	const bboxNodeB = bounds(nodeB);
	const bboxMeshA = primBounds(primA);
	const bboxMeshB = primBounds(primB);

	// NodeA now affects scene bounds, because bounds() does not check IBMs.
	t.deepEquals(bboxScene, {min: [-.5, -.5, -.5], max: [25, 15, .5]}, 'bbox - scene');
	t.deepEquals(bboxNodeA, {min: [20, 10, 0], max: [25, 15, 0]}, 'bbox - nodeA');
	t.deepEquals(bboxNodeB, {min: [-.5, -.5, -.5], max: [.5, .5, .5]}, 'bbox - nodeB');
	t.deepEquals(bboxMeshA, {min: [-1, -1, 0], max: [1, 1, 0]}, 'bbox - meshA');
	t.deepEquals(bboxMeshB, {min: [-1, -1, -1], max: [1, 1, 1]}, 'bbox - meshB');
	t.deepEquals(
		Array.from(nodeB.getSkin().getInverseBindMatrices().getArray()),
		[
			50, 0, 0, 0,
			0, 50, 0, 0,
			0, 0, 50, 0,
			50, 50, 50, 1,
			50, 0, 0, 0,
			0, 50, 0, 0,
			0, 0, 50, 0,
			50, 50, 50, 1,
		],
		'ibm - meshB'
	);
	t.equals(doc.getRoot().listNodes().length, 2, 'total nodes');
	t.equals(doc.getRoot().listAccessors().length, 3, 'total accessors');
	t.equals(doc.getRoot().listSkins().length, 1, 'total skins');
	t.end();
});

test.only('@gltf-transform/functions::quantize | morph targets', async t => {
	const doc = new Document().setLogger(logger);
	const target = doc.createPrimitiveTarget()
		.setAttribute(
			'POSITION',
			doc.createAccessor()
				.setType('VEC3')
				.setArray(new Float32Array([
					0, 0, 0,
					10, 0, 0,
					0, 20, 0,
					0, 0, 30,
					40, 40, 40,
				]))
		);
	const prim = createPrimitive(doc).addTarget(target);
	const scene = doc.getRoot().listScenes().pop();

	const bboxSceneCopy = bounds(scene);
	const bboxMeshCopy = primBounds(prim);

	t.deepEquals(bboxSceneCopy, {min: [10, 10, 0], max: [15, 15, 0]}, 'original bbox - scene');
	t.deepEquals(bboxMeshCopy, {min: [10, 10, 0], max: [15, 15, 0]}, 'original bbox - mesh');

	await doc.transform(quantize({quantizePosition: 14}));

	const bboxScene = roundBbox(bounds(scene), 2);
	const bboxMesh = roundBbox(primBounds(prim), 3);
	const bboxTarget = roundBbox(primBounds(target), 3);

	console.log(Array.from(target.getAttribute('POSITION').getArray()));

	t.deepEquals(bboxScene, {min: [10, 10, 0], max: [15, 15, 0]}, 'bbox - scene');
	t.deepEquals(bboxMesh, {min: [-.5, -.5, -1], max: [-.25, -.25, -1]}, 'bbox - mesh');

	// TODO(bug): Because morph targets aren't offset, we're not mapping them
	// to the [-1,1] range the way we are vertex positions... we can't offset
	// them, so I think we need to calculate the scale differently in this case?
	// that is, the full extent of the morph targets factors into scale, not just
	// the (max-min) span.
	t.deepEquals(bboxTarget, {min: [0, 0, 0], max: [1, 1, 1]}, 'bbox - target');
	t.end();
});

test('@gltf-transform/functions::quantize | attributes', async t => {
	const doc = new Document().setLogger(logger);
	const prim = createPrimitive(doc);
	const normalCopy = prim.getAttribute('NORMAL').clone();
	const tangentCopy = prim.getAttribute('TANGENT').clone();
	const uvCopy = prim.getAttribute('TEXCOORD_0').clone();
	const colorCopy = prim.getAttribute('COLOR_0').clone();
	const jointsCopy = prim.getAttribute('JOINTS_0').clone();
	const weightsCopy = prim.getAttribute('WEIGHTS_0').clone();
	const tempCopy = prim.getAttribute('_TEMPERATURE').clone();

	await doc.transform(quantize({
		quantizeNormal: 12,
		quantizeTexcoord: 12,
		quantizeColor: 8,
		quantizeWeight: 10,
		quantizeGeneric: 10,
	}));

	const normal = prim.getAttribute('NORMAL');
	const tangent = prim.getAttribute('TANGENT');
	const uv = prim.getAttribute('TEXCOORD_0');
	const color = prim.getAttribute('COLOR_0');
	const joints = prim.getAttribute('JOINTS_0');
	const weights = prim.getAttribute('WEIGHTS_0');
	const temp = prim.getAttribute('_TEMPERATURE');

	if (normalCopy.getNormalized() || !(normalCopy.getArray() instanceof Float32Array)) {
		t.fail('Backup copy of normals was modified');
	}
	if (tangentCopy.getNormalized() || !(tangentCopy.getArray() instanceof Float32Array)) {
		t.fail('Backup copy of tangents was modified');
	}
	if (uvCopy.getNormalized() || !(uvCopy.getArray() instanceof Float32Array)) {
		t.fail('Backup copy of UVs was modified');
	}
	if (colorCopy.getNormalized() || !(colorCopy.getArray() instanceof Float32Array)) {
		t.fail('Backup copy of colors was modified');
	}
	if (jointsCopy.getNormalized() || !(jointsCopy.getArray() instanceof Float32Array)) {
		t.fail('Backup copy of joints was modified');
	}
	if (weightsCopy.getNormalized() || !(weightsCopy.getArray() instanceof Float32Array)) {
		t.fail('Backup copy of weights was modified');
	}
	if (tempCopy.getNormalized() || !(tempCopy.getArray() instanceof Float32Array)) {
		t.fail('Backup copy of custom attribute was modified');
	}

	t.ok(normal.getNormalized(), 'normal → normalized');
	t.ok(normal.getArray() instanceof Int16Array, 'normal → Int16Array');
	elementPairs(normal, normalCopy, round(2))
		.forEach(([a, b], i) => t.deepEquals(a, b, `normal value #${i + 1}`));

	t.ok(tangent.getNormalized(), 'tangent → normalized');
	t.ok(tangent.getArray() instanceof Int16Array, 'tangent → Int16Array');
	elementPairs(tangent, tangentCopy, round(2))
		.forEach(([a, b], i) => t.deepEquals(a, b, `tangent value #${i + 1}`));

	t.ok(uv.getNormalized(), 'uv → normalized');
	t.ok(uv.getArray() instanceof Uint16Array, 'uv → Uint16Array');
	elementPairs(uv, uvCopy, round(3))
		.forEach(([a, b], i) => t.deepEquals(a, b, `uv value #${i + 1}`));

	t.ok(color.getNormalized(), 'color → normalized');
	t.ok(color.getArray() instanceof Uint8Array, 'color → Uint8Array');
	elementPairs(color, colorCopy, round(1))
		.forEach(([a, b], i) => t.deepEquals(a, b, `color value #${i + 1}`));

	t.notOk(joints.getNormalized(), 'joints → normalized');
	t.ok(joints.getArray() instanceof Uint8Array, 'joints → Uint8Array');
	elementPairs(joints, jointsCopy, round(6))
		.forEach(([a, b], i) => t.deepEquals(a, b, `joints value #${i + 1}`));
	t.ok(weights.getNormalized(), 'weights → normalized');
	t.ok(weights.getArray() instanceof Uint16Array, 'weights → Uint16Array');
	elementPairs(weights, weightsCopy, round(6))
		.forEach(([a, b], i) => t.deepEquals(a, b, `weights value #${i + 1}`));

	t.ok(temp.getNormalized(), 'custom → normalized');
	t.ok(temp.getArray() instanceof Uint16Array, 'custom → Uint16Array');
	elementPairs(temp, tempCopy, round(3))
		.forEach(([a, b], i) => t.deepEquals(a, b, `custom value #${i + 1}`));

	t.end();
});

test('@gltf-transform/functions::quantize | indices', async t => {
	const doc = new Document().setLogger(logger);
	const prim = createPrimitive(doc);
	prim.setIndices(
		doc.createAccessor()
			.setType('SCALAR')
			.setArray(new Uint32Array([0, 1, 2, 3, 4]))
	);
	const indicesCopy = prim.getIndices().clone();

	await doc.transform(quantize());

	const indices = prim.getIndices();

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
function round(decimals: number): (v: number) => number {
	const f = Math.pow(10, decimals);
	return (v: number) => Math.round(v * f) / f;
}

function roundBbox(bbox: bbox, decimals: number): bbox {
	return {
		min: bbox.min.map(round(decimals)) as vec3,
		max: bbox.max.map(round(decimals)) as vec3,
	};
}

function primBounds(prim: Primitive | PrimitiveTarget): bbox {
	return {
		min: prim.getAttribute('POSITION').getMinNormalized([]) as vec3,
		max: prim.getAttribute('POSITION').getMaxNormalized([]) as vec3,
	};
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

function createScene(doc: Document): Scene {
	const meshA = doc.createMesh('A')
		.addPrimitive(
			doc.createPrimitive()
				.setAttribute(
					'POSITION',
					doc.createAccessor()
						.setType('VEC3')
						.setArray(new Float32Array([
							10, 10, 0,
							10, 15, 0,
							15, 10, 0,
							15, 15, 0,
							10, 10, 0,
						]))
				)
		);

	const meshB = doc.createMesh('B')
		.addPrimitive(
			doc.createPrimitive()
				.setAttribute(
					'POSITION',
					doc.createAccessor()
						.setType('VEC3')
						.setArray(new Float32Array([
							0, 0, 100,
							0, 100, 0,
							100, 0, 0,
							100, 0, 100,
							100, 100, 0,
						]))
				)
		);

	const nodeA = doc.createNode('A')
		.setTranslation([10, 0, 0])
		.setScale([1, 1, 1])
		.setMesh(meshA);

	const nodeB = doc.createNode('B')
		.setTranslation([0, 0, 0])
		.setScale([0.5, 0.5, 0.5])
		.setMesh(meshB);

	return doc.createScene().addChild(nodeA).addChild(nodeB);
}

function createPrimitive(doc: Document): Primitive {
	const prim = doc.createPrimitive()
		.setMode(Primitive.Mode.TRIANGLES)
		.setAttribute('POSITION', doc.createAccessor('POSITION')
			.setType('VEC3')
			.setArray(new Float32Array([
				10, 10, 0,
				10, 15, 0,
				15, 10, 0,
				15, 15, 0,
				10, 10, 0,
			]))
		)
		.setAttribute('TEXCOORD_0', doc.createAccessor('TEXCOORD_0')
			.setType('VEC2')
			.setArray(new Float32Array([
				0.00, 0.00,
				0.50, 0.50,
				0.75, 0.25,
				1.00, 0.00,
				1.00, 1.00,
			]))
		)
		.setAttribute('NORMAL', doc.createAccessor('NORMAL')
			.setType('VEC3')
			.setArray(new Float32Array([
				-0.19211, -0.93457, 0.29946,
				-0.08526, -0.99393, 0.06957,
				0.82905, -0.39715, 0.39364,
				0.37303, -0.68174, 0.62934,
				-0.06048, 0.04752, 0.99704,
			]))
		)
		.setAttribute('TANGENT', doc.createAccessor('TANGENT')
			.setType('VEC4')
			.setArray(new Float32Array([
				-0.19211, -0.93457, 0.29946, 1.0,
				-0.08526, -0.99393, 0.06957, -1.0,
				0.82905, -0.39715, 0.39364, 1.0,
				0.37303, -0.68174, 0.62934, 1.0,
				-0.06048, 0.04752, 0.99704, -1.0
			]))
		)
		.setAttribute('COLOR_0', doc.createAccessor('COLOR_0')
			.setType('VEC3')
			.setArray(new Float32Array([
				0.19, 0.93, 0.29,
				0.08, 0.99, 0.06,
				0.82, 0.39, 0.39,
				0.37, 0.68, 0.62,
				0.06, 0.04, 0.99,
			]))
		)
		.setAttribute('JOINTS_0', doc.createAccessor('JOINTS_0')
			.setType('VEC4')
			.setArray(new Float32Array([
				0, 0, 0, 0,
				1, 0, 0, 0,
				2, 0, 0, 0,
				3, 0, 0, 0,
				4, 0, 0, 0,
			]))
		)
		.setAttribute('WEIGHTS_0', doc.createAccessor('WEIGHTS_0')
			.setType('VEC4')
			.setArray(new Float32Array([
				1, 0, 0, 0,
				1, 0, 0, 0,
				1, 0, 0, 0,
				1, 0, 0, 0,
				1, 0, 0, 0,
			]))
		)
		.setAttribute('_TEMPERATURE', doc.createAccessor('_TEMPERATURE')
			.setType('SCALAR')
			.setArray(new Float32Array([
				0.56,
				0.65,
				0.85,
				0.92,
				0.81,
			]))
		);

	doc.createScene().addChild(doc.createNode().setMesh(doc.createMesh().addPrimitive(prim)));
	return prim;
}