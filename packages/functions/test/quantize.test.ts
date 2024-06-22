import test from 'ava';
import {
	Accessor,
	AnimationChannel,
	bbox,
	getBounds,
	Document,
	Mesh,
	Node,
	Primitive,
	PrimitiveTarget,
	Scene,
	vec3,
} from '@gltf-transform/core';
import { EXTMeshGPUInstancing, KHRMaterialsVolume, Volume } from '@gltf-transform/extensions';
import { quantize } from '@gltf-transform/functions';
import { logger, round, roundBbox } from '@gltf-transform/test-utils';

test('noop', async (t) => {
	const document = new Document().setLogger(logger);
	await document.transform(quantize());

	t.false(
		document
			.getRoot()
			.listExtensionsUsed()
			.some((ext) => ext.extensionName === 'KHR_mesh_quantization'),
		'skips extension',
	);
});

test('exclusions', async (t) => {
	const doc = new Document().setLogger(logger);
	const prim = createPrimitive(doc);

	await doc.transform(quantize({ pattern: /^(?!TEXCOORD_0$|NORMAL$)/ }));

	t.truthy(prim.getAttribute('POSITION').getArray() instanceof Int16Array, 'position → Int16Array');
	t.truthy(prim.getAttribute('TEXCOORD_0').getArray() instanceof Float32Array, 'uv → unchanged');
	t.truthy(prim.getAttribute('NORMAL').getArray() instanceof Float32Array, 'normal → unchanged');

	await doc.transform(quantize());

	t.truthy(prim.getAttribute('TEXCOORD_0').getArray() instanceof Uint16Array, 'uv → Uint16Array');
	t.truthy(prim.getAttribute('NORMAL').getArray() instanceof Int16Array, 'normal → Int16Array');
});

test('mesh volume', async (t) => {
	const doc = new Document().setLogger(logger);
	const scene = createScene(doc);
	const nodeA = doc.getRoot().listNodes()[0];
	const nodeB = doc.getRoot().listNodes()[1];
	const primA = doc.getRoot().listMeshes()[0].listPrimitives()[0];
	const primB = doc.getRoot().listMeshes()[1].listPrimitives()[0];

	const bboxSceneCopy = getBounds(scene);
	const bboxNodeACopy = getBounds(nodeA);
	const bboxNodeBCopy = getBounds(nodeB);
	const bboxMeshACopy = primBounds(primA);
	const bboxMeshBCopy = primBounds(primB);

	t.deepEqual(bboxSceneCopy, { min: [0, 0, 0], max: [50, 50, 50] }, 'original bbox - scene');
	t.deepEqual(bboxNodeACopy, { min: [20, 10, 0], max: [25, 15, 0] }, 'original bbox - nodeA');
	t.deepEqual(bboxNodeBCopy, { min: [0, 0, 0], max: [50, 50, 50] }, 'original bbox - nodeB');
	t.deepEqual(bboxMeshACopy, { min: [10, 10, 0], max: [15, 15, 0] }, 'original bbox - meshA');
	t.deepEqual(bboxMeshBCopy, { min: [0, 0, 0], max: [100, 100, 100] }, 'original bbox - meshB');

	await doc.transform(quantize({ quantizePosition: 14 }));

	const bboxScene = getBounds(scene);
	const bboxNodeA = getBounds(nodeA);
	const bboxNodeB = getBounds(nodeB);
	const bboxMeshA = primBounds(primA);
	const bboxMeshB = primBounds(primB);

	t.deepEqual(bboxScene, { min: [0, 0, 0], max: [50, 50, 50] }, 'bbox - scene');
	t.deepEqual(bboxNodeA, { min: [20, 10, 0], max: [25, 15, 0] }, 'bbox - nodeA');
	t.deepEqual(bboxNodeB, { min: [0, 0, 0], max: [50, 50, 50] }, 'bbox - nodeB');
	t.deepEqual(bboxMeshA, { min: [-1, -1, 0], max: [1, 1, 0] }, 'bbox - meshA');
	t.deepEqual(bboxMeshB, { min: [-1, -1, -1], max: [1, 1, 1] }, 'bbox - meshB');
	t.is(doc.getRoot().listNodes().length, 2, 'total nodes');
	t.is(doc.getRoot().listAccessors().length, 2, 'total accessors');
	t.is(doc.getRoot().listSkins().length, 0, 'total skins');
});

test('scene volume', async (t) => {
	const doc = new Document().setLogger(logger);
	const scene = createScene(doc);
	const nodeA = doc.getRoot().listNodes()[0];
	const nodeB = doc.getRoot().listNodes()[1];
	const primA = doc.getRoot().listMeshes()[0].listPrimitives()[0];
	const primB = doc.getRoot().listMeshes()[1].listPrimitives()[0];

	const bboxSceneCopy = getBounds(scene);
	const bboxNodeACopy = getBounds(nodeA);
	const bboxNodeBCopy = getBounds(nodeB);
	const bboxMeshACopy = primBounds(primA);
	const bboxMeshBCopy = primBounds(primB);

	t.deepEqual(bboxSceneCopy, { min: [0, 0, 0], max: [50, 50, 50] }, 'original bbox - scene');
	t.deepEqual(bboxNodeACopy, { min: [20, 10, 0], max: [25, 15, 0] }, 'original bbox - nodeA');
	t.deepEqual(bboxNodeBCopy, { min: [0, 0, 0], max: [50, 50, 50] }, 'original bbox - nodeB');
	t.deepEqual(bboxMeshACopy, { min: [10, 10, 0], max: [15, 15, 0] }, 'original bbox - meshA');
	t.deepEqual(bboxMeshBCopy, { min: [0, 0, 0], max: [100, 100, 100] }, 'original bbox - meshB');

	await doc.transform(
		quantize({
			quantizePosition: 14,
			quantizationVolume: 'scene',
		}),
	);

	const bboxScene = roundBbox(getBounds(scene), 3);
	const bboxNodeA = roundBbox(getBounds(nodeA), 2);
	const bboxNodeB = roundBbox(getBounds(nodeB), 3);
	const bboxMeshA = roundBbox(primBounds(primA), 3);
	const bboxMeshB = roundBbox(primBounds(primB), 3);

	t.deepEqual(bboxScene, { min: [0, 0, 0], max: [50, 50, 50] }, 'bbox - scene');
	t.deepEqual(bboxNodeA, { min: [20, 10, 0], max: [25, 15, 0] }, 'bbox - nodeA');
	t.deepEqual(bboxNodeB, { min: [0, 0, 0], max: [50, 50, 50] }, 'bbox - nodeB');
	t.deepEqual(bboxMeshA, { min: [-0.8, -0.8, -1], max: [-0.7, -0.7, -1] }, 'bbox - meshA');
	t.deepEqual(bboxMeshB, { min: [-1, -1, -1], max: [1, 1, 1] }, 'bbox - meshB');
	t.is(doc.getRoot().listNodes().length, 2, 'total nodes');
	t.is(doc.getRoot().listAccessors().length, 2, 'total accessors');
	t.is(doc.getRoot().listSkins().length, 0, 'total skins');
});

test('skinned mesh', async (t) => {
	const doc = new Document().setLogger(logger);
	const scene = createScene(doc);
	const nodeA = doc.getRoot().listNodes()[0];
	const nodeB = doc.getRoot().listNodes()[1];
	const primA = doc.getRoot().listMeshes()[0].listPrimitives()[0];
	const primB = doc.getRoot().listMeshes()[1].listPrimitives()[0];

	const bboxSceneCopy = getBounds(scene);
	const bboxNodeACopy = getBounds(nodeA);
	const bboxNodeBCopy = getBounds(nodeB);
	const bboxMeshACopy = primBounds(primA);
	const bboxMeshBCopy = primBounds(primB);

	t.deepEqual(bboxSceneCopy, { min: [0, 0, 0], max: [50, 50, 50] }, 'original bbox - scene');
	t.deepEqual(bboxNodeACopy, { min: [20, 10, 0], max: [25, 15, 0] }, 'original bbox - nodeA');
	t.deepEqual(bboxNodeBCopy, { min: [0, 0, 0], max: [50, 50, 50] }, 'original bbox - nodeB');
	t.deepEqual(bboxMeshACopy, { min: [10, 10, 0], max: [15, 15, 0] }, 'original bbox - meshA');
	t.deepEqual(bboxMeshBCopy, { min: [0, 0, 0], max: [100, 100, 100] }, 'original bbox - meshB');

	const ibm = doc
		.createAccessor()
		.setType('MAT4')
		.setArray(
			new Float32Array([
				1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
			]),
		);
	nodeB.setSkin(doc.createSkin().setInverseBindMatrices(ibm));

	await doc.transform(quantize({ quantizePosition: 14 }));

	const bboxScene = getBounds(scene);
	const bboxNodeA = getBounds(nodeA);
	const bboxNodeB = getBounds(nodeB);
	const bboxMeshA = primBounds(primA);
	const bboxMeshB = primBounds(primB);

	// NodeA now affects scene bounds, because getBounds() does not check IBMs.
	t.deepEqual(bboxScene, { min: [-0.5, -0.5, -0.5], max: [25, 15, 0.5] }, 'bbox - scene');
	t.deepEqual(bboxNodeA, { min: [20, 10, 0], max: [25, 15, 0] }, 'bbox - nodeA');
	t.deepEqual(bboxNodeB, { min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] }, 'bbox - nodeB');
	t.deepEqual(bboxMeshA, { min: [-1, -1, 0], max: [1, 1, 0] }, 'bbox - meshA');
	t.deepEqual(bboxMeshB, { min: [-1, -1, -1], max: [1, 1, 1] }, 'bbox - meshB');
	t.deepEqual(
		Array.from(nodeB.getSkin().getInverseBindMatrices().getArray()),
		[50, 0, 0, 0, 0, 50, 0, 0, 0, 0, 50, 0, 50, 50, 50, 1, 50, 0, 0, 0, 0, 50, 0, 0, 0, 0, 50, 0, 50, 50, 50, 1],
		'ibm - meshB',
	);
	t.is(doc.getRoot().listNodes().length, 2, 'total nodes');
	t.is(doc.getRoot().listAccessors().length, 3, 'total accessors');
	t.is(doc.getRoot().listSkins().length, 1, 'total skins');
});

test('morph targets', async (t) => {
	const doc = new Document().setLogger(logger);

	// Note: Neither prim.POSITION nor target.POSITION includes the origin (<0,0,0>),
	// but it MUST be included in the quantization volume to quantize targets correctly.
	const target = doc.createPrimitiveTarget().setAttribute(
		'POSITION',
		doc
			.createAccessor()
			.setType('VEC3')
			.setArray(new Float32Array([5, 5, 5, 10, 5, 5, 10, 20, 5, 10, 5, 30, 40, 40, 40])),
	);
	const prim = createPrimitive(doc).addTarget(target);
	prim.getAttribute('POSITION').setArray(new Float32Array([10, 10, 5, 10, 15, 5, 15, 10, 5, 15, 15, 5, 10, 10, 5]));

	const scene = doc.getRoot().listScenes().pop();

	const bboxSceneCopy = getBounds(scene);
	const bboxMeshCopy = primBounds(prim);
	const bboxTargetCopy = primBounds(target);

	t.deepEqual(bboxSceneCopy, { min: [10, 10, 5], max: [15, 15, 5] }, 'original bbox - scene');
	t.deepEqual(bboxMeshCopy, { min: [10, 10, 5], max: [15, 15, 5] }, 'original bbox - mesh');
	t.deepEqual(bboxTargetCopy, { min: [5, 5, 5], max: [40, 40, 40] }, 'original bbox - target');

	await doc.transform(quantize({ quantizePosition: 14 }));

	const bboxScene = roundBbox(getBounds(scene), 2);
	const bboxMesh = roundBbox(primBounds(prim), 3);
	const bboxTarget = roundBbox(primBounds(target), 3);

	t.deepEqual(bboxScene, { min: [10, 10, 5], max: [15, 15, 5] }, 'bbox - scene');
	t.deepEqual(bboxMesh, { min: [-0.75, -0.75, -0.875], max: [-0.625, -0.625, -0.875] }, 'bbox - mesh');
	t.deepEqual(bboxTarget, { min: [0.125, 0.125, 0.125], max: [1, 1, 1] }, 'bbox - target');
});

test('attributes', async (t) => {
	const doc = new Document().setLogger(logger);
	const prim = createPrimitive(doc);
	const normalCopy = prim.getAttribute('NORMAL').clone();
	const tangentCopy = prim.getAttribute('TANGENT').clone();
	const uvCopy = prim.getAttribute('TEXCOORD_0').clone();
	const colorCopy = prim.getAttribute('COLOR_0').clone();
	const jointsCopy = prim.getAttribute('JOINTS_0').clone();
	const weightsCopy = prim.getAttribute('WEIGHTS_0').clone();
	const tempCopy = prim.getAttribute('_TEMPERATURE').clone();

	await doc.transform(
		quantize({
			quantizeNormal: 12,
			quantizeTexcoord: 12,
			quantizeColor: 8,
			quantizeWeight: 10,
			quantizeGeneric: 10,
		}),
	);

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

	t.truthy(normal.getNormalized(), 'normal → normalized');
	t.truthy(normal.getArray() instanceof Int16Array, 'normal → Int16Array');
	elementPairs(normal, normalCopy, round(2)).forEach(([a, b], i) => t.deepEqual(a, b, `normal value #${i + 1}`));

	t.truthy(tangent.getNormalized(), 'tangent → normalized');
	t.truthy(tangent.getArray() instanceof Int16Array, 'tangent → Int16Array');
	elementPairs(tangent, tangentCopy, round(2)).forEach(([a, b], i) => t.deepEqual(a, b, `tangent value #${i + 1}`));

	t.truthy(uv.getNormalized(), 'uv → normalized');
	t.truthy(uv.getArray() instanceof Uint16Array, 'uv → Uint16Array');
	elementPairs(uv, uvCopy, round(3)).forEach(([a, b], i) => t.deepEqual(a, b, `uv value #${i + 1}`));

	t.truthy(color.getNormalized(), 'color → normalized');
	t.truthy(color.getArray() instanceof Uint8Array, 'color → Uint8Array');
	elementPairs(color, colorCopy, round(1)).forEach(([a, b], i) => t.deepEqual(a, b, `color value #${i + 1}`));

	t.falsy(joints.getNormalized(), 'joints → normalized');
	t.truthy(joints.getArray() instanceof Uint8Array, 'joints → Uint8Array');
	elementPairs(joints, jointsCopy, round(6)).forEach(([a, b], i) => t.deepEqual(a, b, `joints value #${i + 1}`));
	t.truthy(weights.getNormalized(), 'weights → normalized');
	t.truthy(weights.getArray() instanceof Uint16Array, 'weights → Uint16Array');
	elementPairs(weights, weightsCopy, round(6)).forEach(([a, b], i) => t.deepEqual(a, b, `weights value #${i + 1}`));

	t.truthy(temp.getNormalized(), 'custom → normalized');
	t.truthy(temp.getArray() instanceof Uint16Array, 'custom → Uint16Array');
	elementPairs(temp, tempCopy, round(3)).forEach(([a, b], i) => t.deepEqual(a, b, `custom value #${i + 1}`));
});

test('indices', async (t) => {
	const doc = new Document().setLogger(logger);
	const prim = createPrimitive(doc);
	prim.setIndices(
		doc
			.createAccessor()
			.setType('SCALAR')
			.setArray(new Uint32Array([0, 1, 2, 3, 4])),
	);
	const indicesCopy = prim.getIndices().clone();

	await doc.transform(quantize());

	const indices = prim.getIndices();

	if (indicesCopy.getNormalized() || !(indicesCopy.getArray() instanceof Uint32Array)) {
		t.fail('Backup copy of indices was modified');
	}

	t.falsy(indices.getNormalized(), 'indices → not normalized');
	t.truthy(indices.getArray() instanceof Uint16Array, 'indices → Uint16Array');
	elementPairs(indices, indicesCopy, round(8)).forEach(([a, b], i) => t.deepEqual(a, b, `indices value #${i + 1}`));
});

test('skinned mesh parenting', async (t) => {
	let doc: Document;
	let mesh: Mesh, node: Node;
	let scaleChannel: AnimationChannel, weightsChannel: AnimationChannel;

	// (1) Don't reparent meshes or retarget non-TRS animation when not required.

	doc = new Document().setLogger(logger);
	createScene(doc);
	node = doc.getRoot().listNodes()[0];
	mesh = node.getMesh();
	weightsChannel = doc.createAnimationChannel().setTargetNode(node).setTargetPath('weights');
	doc.createAnimation().addChannel(weightsChannel);

	await doc.transform(quantize());

	t.is(node.getMesh(), mesh, "don't reparent mesh");
	t.is(weightsChannel.getTargetNode(), node, "don't retarget non-TRS animation");

	// (2) Reparent meshes and retarget non-TRS animation when parent is affected by TRS animation.

	doc = new Document().setLogger(logger);
	createScene(doc);
	node = doc.getRoot().listNodes()[0];
	mesh = node.getMesh();
	// eslint-disable-next-line prefer-const
	scaleChannel = doc.createAnimationChannel().setTargetNode(node).setTargetPath('scale');
	weightsChannel = doc.createAnimationChannel().setTargetNode(node).setTargetPath('weights');
	doc.createAnimation().addChannel(weightsChannel).addChannel(scaleChannel);

	await doc.transform(quantize());

	t.is(node.getMesh(), null, 'reparent mesh');
	t.is(weightsChannel.getTargetNode(), node.listChildren()[0], 'retarget non-TRS animation');
	t.is(scaleChannel.getTargetNode(), node, "don't retarget TRS animation");
});

test('instancing', async (t) => {
	const doc = new Document().setLogger(logger);
	createScene(doc);
	const node = doc.getRoot().listNodes()[0];
	const mesh = node.getMesh();
	const batchExtension = doc.createExtension(EXTMeshGPUInstancing);
	const batchTranslation = doc
		.createAccessor()
		.setType('VEC3')
		.setArray(new Float32Array([0, 0, 0, 1, 1, 1]));
	let batch = batchExtension.createInstancedMesh().setAttribute('TRANSLATION', batchTranslation);
	node.setExtension('EXT_mesh_gpu_instancing', batch);

	await doc.transform(quantize());

	batch = node.getExtension('EXT_mesh_gpu_instancing');

	t.is(node.getMesh(), mesh, 'node hash mesh');
	t.deepEqual(node.getTranslation(), [10, 0, 0], 'node has original translation');
	t.deepEqual(node.getScale(), [1, 1, 1], 'node has original scale');
	t.truthy(batch, 'node has instancing extension');
	t.deepEqual(
		Array.from(batch.getAttribute('TRANSLATION').getArray()),
		[12.5, 12.5, 0, 13.5, 13.5, 1],
		'batch translation includes quantization transform',
	);
});

test('volumetric materials', async (t) => {
	const doc = new Document().setLogger(logger);
	createScene(doc);
	const primA = doc.getRoot().listNodes()[0].getMesh().listPrimitives()[0];
	const primB = doc.getRoot().listNodes()[1].getMesh().listPrimitives()[0];

	// Add volumetric material (thickness is in local units).
	const volumeExtension = doc.createExtension(KHRMaterialsVolume);
	const volume = volumeExtension.createVolume().setThicknessFactor(1.0);
	const material = doc.createMaterial().setExtension('KHR_materials_volume', volume);
	primA.setMaterial(material);
	primB.setMaterial(material);

	await doc.transform(quantize());

	t.truthy(primA.getMaterial() !== material, 'new material for prim A');
	t.truthy(primB.getMaterial() !== material, 'new material for prim B');
	t.truthy(material.isDisposed(), 'dispose old material');
	t.is(doc.getRoot().listMaterials().length, 2, 'material count = 2');

	const volumeA = primA.getMaterial().getExtension<Volume>('KHR_materials_volume');
	const volumeB = primB.getMaterial().getExtension<Volume>('KHR_materials_volume');
	t.is(volumeA.getThicknessFactor(), 1 / 2.5, 'volumeA.thickness');
	t.is(volumeB.getThicknessFactor(), 1 / 50, 'volumeB.thickness');
});

test('no side effects', async (t) => {
	const document = new Document();
	const attributeA = document.createAccessor().setType('VEC3').setArray(new Float32Array(9));
	attributeA.clone();

	await document.transform(quantize({ cleanup: false }));

	t.is(document.getRoot().listAccessors().length, 2, 'skips prune and dedup');
});

/* UTILITIES */

function primBounds(prim: Primitive | PrimitiveTarget): bbox {
	return {
		min: prim.getAttribute('POSITION').getMinNormalized([]) as vec3,
		max: prim.getAttribute('POSITION').getMaxNormalized([]) as vec3,
	};
}

/** Returns an array of pairs, containing the aligned elements for each of two Accessors. */
function elementPairs(a: Accessor, b: Accessor, roundFn: (v: number) => number): number[][][] {
	const pairs = [];
	for (let i = 0, il = a.getCount(); i < il; i++) {
		pairs.push([a.getElement(i, []).map(roundFn), b.getElement(i, []).map(roundFn)]);
	}
	return pairs;
}

function createScene(doc: Document): Scene {
	const meshA = doc.createMesh('A').addPrimitive(
		doc.createPrimitive().setAttribute(
			'POSITION',
			doc
				.createAccessor()
				.setType('VEC3')

				.setArray(
					// prettier-ignore
					new Float32Array([
						10, 10, 0,
						10, 15, 0,
						15, 10, 0,
						15, 15, 0,
						10, 10, 0
					]),
				),
		),
	);

	const meshB = doc.createMesh('B').addPrimitive(
		doc.createPrimitive().setAttribute(
			'POSITION',
			doc
				.createAccessor()
				.setType('VEC3')
				.setArray(
					// prettier-ignore
					new Float32Array([
						0, 0, 100,
						0, 100, 0,
						100, 0, 0,
						100, 0, 100,
						100, 100, 0
					]),
				),
		),
	);

	const nodeA = doc.createNode('A').setTranslation([10, 0, 0]).setScale([1, 1, 1]).setMesh(meshA);

	const nodeB = doc.createNode('B').setTranslation([0, 0, 0]).setScale([0.5, 0.5, 0.5]).setMesh(meshB);

	return doc.createScene().addChild(nodeA).addChild(nodeB);
}

function createPrimitive(doc: Document): Primitive {
	const prim = doc
		.createPrimitive()
		.setMode(Primitive.Mode.TRIANGLES)
		.setAttribute(
			'POSITION',
			doc
				.createAccessor('POSITION')
				.setType('VEC3')
				.setArray(new Float32Array([10, 10, 0, 10, 15, 0, 15, 10, 0, 15, 15, 0, 10, 10, 0])),
		)
		.setAttribute(
			'TEXCOORD_0',
			doc
				.createAccessor('TEXCOORD_0')
				.setType('VEC2')
				.setArray(new Float32Array([0.0, 0.0, 0.5, 0.5, 0.75, 0.25, 1.0, 0.0, 1.0, 1.0])),
		)
		.setAttribute(
			'NORMAL',
			doc
				.createAccessor('NORMAL')
				.setType('VEC3')
				.setArray(
					new Float32Array([
						-0.19211, -0.93457, 0.29946, -0.08526, -0.99393, 0.06957, 0.82905, -0.39715, 0.39364, 0.37303,
						-0.68174, 0.62934, -0.06048, 0.04752, 0.99704,
					]),
				),
		)
		.setAttribute(
			'TANGENT',
			doc
				.createAccessor('TANGENT')
				.setType('VEC4')
				.setArray(
					new Float32Array([
						-0.19211, -0.93457, 0.29946, 1.0, -0.08526, -0.99393, 0.06957, -1.0, 0.82905, -0.39715, 0.39364,
						1.0, 0.37303, -0.68174, 0.62934, 1.0, -0.06048, 0.04752, 0.99704, -1.0,
					]),
				),
		)
		.setAttribute(
			'COLOR_0',
			doc
				.createAccessor('COLOR_0')
				.setType('VEC3')
				.setArray(
					new Float32Array([
						0.19, 0.93, 0.29, 0.08, 0.99, 0.06, 0.82, 0.39, 0.39, 0.37, 0.68, 0.62, 0.06, 0.04, 0.99,
					]),
				),
		)
		.setAttribute(
			'JOINTS_0',
			doc
				.createAccessor('JOINTS_0')
				.setType('VEC4')
				.setArray(new Float32Array([0, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0, 4, 0, 0, 0])),
		)
		.setAttribute(
			'WEIGHTS_0',
			doc
				.createAccessor('WEIGHTS_0')
				.setType('VEC4')
				.setArray(new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0])),
		)
		.setAttribute(
			'_TEMPERATURE',
			doc
				.createAccessor('_TEMPERATURE')
				.setType('SCALAR')
				.setArray(new Float32Array([0.56, 0.65, 0.85, 0.92, 0.81])),
		);

	doc.createScene().addChild(doc.createNode().setMesh(doc.createMesh().addPrimitive(prim)));
	return prim;
}
