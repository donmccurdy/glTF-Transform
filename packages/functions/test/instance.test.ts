import { Document } from '@gltf-transform/core';
import { EXTMeshGPUInstancing, type InstancedMesh } from '@gltf-transform/extensions';
import { instance } from '@gltf-transform/functions';
import { createTorusKnotPrimitive, logger } from '@gltf-transform/test-utils';
import test from 'ava';

test('translation', async (t) => {
	const doc = new Document().setLogger(logger);
	const root = doc.getRoot();
	const buffer = doc.createBuffer();
	const prim = doc.createPrimitive().setAttribute('POSITION', doc.createAccessor().setBuffer(buffer));
	const mesh = doc.createMesh().addPrimitive(prim);
	const node1 = doc.createNode().setMesh(mesh).setTranslation([0, 0, 0]);
	const node2 = doc.createNode().setMesh(mesh).setTranslation([0, 0, 1]);
	const node3 = doc.createNode().setMesh(mesh).setTranslation([0, 0, 2]);
	doc.createScene().addChild(node1).addChild(node2).addChild(node3);

	await doc.transform(instance({ min: 2 }));

	t.is(root.listNodes().length, 1, 'creates batch node');
	t.is(root.listScenes()[0].listChildren().length, 1, 'attaches batch node');
	t.truthy(node1.isDisposed(), 'disposed node (1/3)');
	t.truthy(node2.isDisposed(), 'disposed node (2/3)');
	t.truthy(node3.isDisposed(), 'disposed node (3/3)');

	const batchNode = root.listNodes()[0];
	const batch = batchNode.getExtension<InstancedMesh>('EXT_mesh_gpu_instancing');

	t.truthy(batch, 'creates batch');
	t.deepEqual(
		batch.getAttribute('TRANSLATION').getArray(),
		new Float32Array([0, 0, 0, 0, 0, 1, 0, 0, 2]),
		'sets batch translation',
	);
	t.is(batch.getAttribute('TRANSLATION').getBuffer(), buffer, 'sets batch buffer');
	t.falsy(batch.getAttribute('ROTATION'), 'skips batch rotation');
	t.falsy(batch.getAttribute('SCALE'), 'skips batch scale');
});

test('rotation', async (t) => {
	const doc = new Document().setLogger(logger);
	const root = doc.getRoot();
	const buffer = doc.createBuffer();
	const prim = doc.createPrimitive().setAttribute('POSITION', doc.createAccessor().setBuffer(buffer));
	const mesh = doc.createMesh().addPrimitive(prim);
	const x = Math.sqrt(0.5);
	const node1 = doc.createNode().setMesh(mesh).setRotation([0, 0, 0, 1]);
	const node2 = doc.createNode().setMesh(mesh).setRotation([x, 0, 0, x]);
	const node3 = doc.createNode().setMesh(mesh).setRotation([0, x, 0, x]);
	doc.createScene().addChild(node1).addChild(node2).addChild(node3);

	await doc.transform(instance({ min: 2 }));

	t.is(root.listNodes().length, 1, 'creates batch node');
	t.is(root.listScenes()[0].listChildren().length, 1, 'attaches batch node');
	t.truthy(node1.isDisposed(), 'disposed node (1/3)');
	t.truthy(node2.isDisposed(), 'disposed node (2/3)');
	t.truthy(node3.isDisposed(), 'disposed node (3/3)');

	const batchNode = root.listNodes()[0];
	const batch = batchNode.getExtension<InstancedMesh>('EXT_mesh_gpu_instancing');

	t.truthy(batch, 'creates batch');
	t.deepEqual(
		batch.getAttribute('ROTATION').getArray(),
		new Float32Array([0, 0, 0, 1, x, 0, 0, x, 0, x, 0, x]),
		'sets batch rotation',
	);
	t.is(batch.getAttribute('ROTATION').getBuffer(), buffer, 'sets batch buffer');
	t.falsy(batch.getAttribute('TRANSLATION'), 'skips batch translation');
	t.falsy(batch.getAttribute('SCALE'), 'skips batch scale');
});

test('scale', async (t) => {
	const doc = new Document().setLogger(logger);
	const root = doc.getRoot();
	const buffer = doc.createBuffer();
	const prim = doc.createPrimitive().setAttribute('POSITION', doc.createAccessor().setBuffer(buffer));
	const mesh = doc.createMesh().addPrimitive(prim);
	const node1 = doc.createNode().setMesh(mesh).setScale([1, 1, 1]);
	const node2 = doc.createNode().setMesh(mesh).setScale([2, 2, 2]);
	const node3 = doc.createNode().setMesh(mesh).setScale([1, 1, 5]);
	doc.createScene().addChild(node1).addChild(node2).addChild(node3);

	await doc.transform(instance({ min: 2 }));

	t.is(root.listNodes().length, 1, 'creates batch node');
	t.is(root.listScenes()[0].listChildren().length, 1, 'attaches batch node');
	t.truthy(node1.isDisposed(), 'disposed node (1/3)');
	t.truthy(node2.isDisposed(), 'disposed node (2/3)');
	t.truthy(node3.isDisposed(), 'disposed node (3/3)');

	const batchNode = root.listNodes()[0];
	const batch = batchNode.getExtension<InstancedMesh>('EXT_mesh_gpu_instancing');

	t.truthy(batch, 'creates batch');
	t.deepEqual(
		batch.getAttribute('SCALE').getArray(),
		new Float32Array([1, 1, 1, 2, 2, 2, 1, 1, 5]),
		'sets batch scale',
	);
	t.is(batch.getAttribute('SCALE').getBuffer(), buffer, 'sets batch buffer');
	t.falsy(batch.getAttribute('TRANSLATION'), 'skips batch translation');
	t.falsy(batch.getAttribute('ROTATION'), 'skips batch rotation');
});

test('skip distinct meshes', async (t) => {
	const doc = new Document().setLogger(logger);
	const root = doc.getRoot();
	const buffer = doc.createBuffer();
	const prim = doc.createPrimitive().setAttribute('POSITION', doc.createAccessor().setBuffer(buffer));
	const mesh = doc.createMesh().addPrimitive(prim);
	const node1 = doc.createNode().setMesh(mesh).setScale([1, 1, 1]);
	const node2 = doc.createNode().setMesh(mesh.clone() /* 🚩 */).setScale([2, 2, 2]);
	const node3 = doc.createNode().setMesh(mesh.clone() /* 🚩 */).setScale([1, 1, 5]);
	doc.createScene().addChild(node1).addChild(node2).addChild(node3);

	await doc.transform(instance());

	t.is(root.listNodes().length, 3, 'keeps original nodes');
	t.falsy(node1.isDisposed(), 'node (1/3)');
	t.falsy(node2.isDisposed(), 'node (2/3)');
	t.falsy(node3.isDisposed(), 'node (3/3)');

	const batchNode = root.listNodes()[0];
	const batch = batchNode.getExtension<InstancedMesh>('EXT_mesh_gpu_instancing');

	t.falsy(batch, 'does not create batch');
});

test('custom_properties_scalar', async (t) => {
	const doc = new Document().setLogger(logger);
	const root = doc.getRoot();
	const buffer = doc.createBuffer();
	const prim = doc.createPrimitive().setAttribute('POSITION', doc.createAccessor().setBuffer(buffer));
	const mesh = doc.createMesh().addPrimitive(prim);
	const node1 = doc.createNode().setMesh(mesh).setTranslation([0, 0, 1]);
	node1.setExtras({ ELEMENT_ID: 1 });
	const node2 = doc.createNode().setMesh(mesh).setTranslation([0, 1, 1]);
	node2.setExtras({ ELEMENT_ID: 2 });
	const node3 = doc.createNode().setMesh(mesh).setTranslation([1, 0, 1]);
	node3.setExtras({ ELEMENT_ID: 3 });
	doc.createScene().addChild(node1).addChild(node2).addChild(node3);

	await doc.transform(instance({ min: 2, keepCustomProperties: true }));

	t.is(root.listNodes().length, 1, 'creates batch node');
	t.is(root.listScenes()[0].listChildren().length, 1, 'attaches batch node');
	t.truthy(node1.isDisposed(), 'disposed node (1/3)');
	t.truthy(node2.isDisposed(), 'disposed node (2/3)');
	t.truthy(node3.isDisposed(), 'disposed node (3/3)');

	const batchNode = root.listNodes()[0];
	const batch = batchNode.getExtension<InstancedMesh>('EXT_mesh_gpu_instancing');

	t.truthy(batch, 'creates batch');
	t.deepEqual(batch.getAttribute('ELEMENT_ID').getArray(), new Float32Array([1, 2, 3]), 'sets batch custom property');
});

test('custom_properties_vec2', async (t) => {
	const doc = new Document().setLogger(logger);
	const root = doc.getRoot();
	const buffer = doc.createBuffer();
	const prim = doc.createPrimitive().setAttribute('POSITION', doc.createAccessor().setBuffer(buffer));
	const mesh = doc.createMesh().addPrimitive(prim);
	const node1 = doc.createNode().setMesh(mesh).setTranslation([0, 0, 1]);
	node1.setExtras({ OFFSET: [1, 2] });
	const node2 = doc.createNode().setMesh(mesh).setTranslation([0, 1, 1]);
	node2.setExtras({ OFFSET: [1, 3] });
	const node3 = doc.createNode().setMesh(mesh).setTranslation([1, 0, 1]);
	node3.setExtras({ OFFSET: [1, 4] });
	doc.createScene().addChild(node1).addChild(node2).addChild(node3);

	await doc.transform(instance({ min: 2, keepCustomProperties: true }));

	t.is(root.listNodes().length, 1, 'creates batch node');
	t.is(root.listScenes()[0].listChildren().length, 1, 'attaches batch node');
	t.truthy(node1.isDisposed(), 'disposed node (1/3)');
	t.truthy(node2.isDisposed(), 'disposed node (2/3)');
	t.truthy(node3.isDisposed(), 'disposed node (3/3)');

	const batchNode = root.listNodes()[0];
	const batch = batchNode.getExtension<InstancedMesh>('EXT_mesh_gpu_instancing');

	t.truthy(batch, 'creates batch');
	t.deepEqual(
		batch.getAttribute('OFFSET').getArray(),
		new Float32Array([1, 2, 1, 3, 1, 4]),
		'sets batch custom property',
	);
});

test('custom_properties_vec3', async (t) => {
	const doc = new Document().setLogger(logger);
	const root = doc.getRoot();
	const buffer = doc.createBuffer();
	const prim = doc.createPrimitive().setAttribute('POSITION', doc.createAccessor().setBuffer(buffer));
	const mesh = doc.createMesh().addPrimitive(prim);
	const node1 = doc.createNode().setMesh(mesh).setTranslation([0, 0, 1]);
	node1.setExtras({ OFFSET: [1, 2, 1] });
	const node2 = doc.createNode().setMesh(mesh).setTranslation([0, 1, 1]);
	node2.setExtras({ OFFSET: [1, 3, 2] });
	const node3 = doc.createNode().setMesh(mesh).setTranslation([1, 0, 1]);
	node3.setExtras({ OFFSET: [1, 4, 3] });
	doc.createScene().addChild(node1).addChild(node2).addChild(node3);

	await doc.transform(instance({ min: 2, keepCustomProperties: true }));

	t.is(root.listNodes().length, 1, 'creates batch node');
	t.is(root.listScenes()[0].listChildren().length, 1, 'attaches batch node');
	t.truthy(node1.isDisposed(), 'disposed node (1/3)');
	t.truthy(node2.isDisposed(), 'disposed node (2/3)');
	t.truthy(node3.isDisposed(), 'disposed node (3/3)');

	const batchNode = root.listNodes()[0];
	const batch = batchNode.getExtension<InstancedMesh>('EXT_mesh_gpu_instancing');

	t.truthy(batch, 'creates batch');
	t.deepEqual(
		batch.getAttribute('OFFSET').getArray(),
		new Float32Array([1, 2, 1, 1, 3, 2, 1, 4, 3]),
		'sets batch custom property',
	);
});

test('custom_properties_vec4', async (t) => {
	const doc = new Document().setLogger(logger);
	const root = doc.getRoot();
	const buffer = doc.createBuffer();
	const prim = doc.createPrimitive().setAttribute('POSITION', doc.createAccessor().setBuffer(buffer));
	const mesh = doc.createMesh().addPrimitive(prim);
	const node1 = doc.createNode().setMesh(mesh).setTranslation([0, 0, 1]);
	node1.setExtras({ OTHER: [1, 2, 1, 1] });
	const node2 = doc.createNode().setMesh(mesh).setTranslation([0, 1, 1]);
	node2.setExtras({ OTHER: [1, 3, 2, 2] });
	const node3 = doc.createNode().setMesh(mesh).setTranslation([1, 0, 1]);
	node3.setExtras({ OTHER: [1, 4, 3, 2] });
	doc.createScene().addChild(node1).addChild(node2).addChild(node3);

	await doc.transform(instance({ min: 2, keepCustomProperties: true }));

	t.is(root.listNodes().length, 1, 'creates batch node');
	t.is(root.listScenes()[0].listChildren().length, 1, 'attaches batch node');
	t.truthy(node1.isDisposed(), 'disposed node (1/3)');
	t.truthy(node2.isDisposed(), 'disposed node (2/3)');
	t.truthy(node3.isDisposed(), 'disposed node (3/3)');

	const batchNode = root.listNodes()[0];
	const batch = batchNode.getExtension<InstancedMesh>('EXT_mesh_gpu_instancing');

	t.truthy(batch, 'creates batch');
	t.deepEqual(
		batch.getAttribute('OTHER').getArray(),
		new Float32Array([1, 2, 1, 1, 1, 3, 2, 2, 1, 4, 3, 2]),
		'sets batch custom property',
	);
});

test('skip existing instances', async (t) => {
	const document = new Document().setLogger(logger);
	const root = document.getRoot();

	const batchExtension = document.createExtension(EXTMeshGPUInstancing);
	const batch = batchExtension.createInstancedMesh();

	const prim = createTorusKnotPrimitive(document, {
		radialSegments: 4,
		tubularSegments: 6,
	});
	const mesh = document.createMesh().addPrimitive(prim);
	const node1 = document.createNode().setMesh(mesh).setExtension('EXT_mesh_gpu_instancing', batch);
	const node2 = document.createNode().setMesh(mesh).setTranslation([0, 0, 0]);
	const node3 = document.createNode().setMesh(mesh).setTranslation([10, 0, 0]);

	document.createScene().addChild(node1).addChild(node2).addChild(node3);

	await document.transform(instance({ min: 2 }));

	t.is(root.listNodes().length, 2, 'keeps 2/3 nodes');

	const [batch1, batch2] = root
		.listNodes()
		.map((node) => node.getExtension<InstancedMesh>('EXT_mesh_gpu_instancing'));

	t.is(batch, batch1, 'keeps batch 1');
	t.truthy(batch2, 'creates batch 2');
	t.not(batch1, batch2, 'batches are not merged');
	t.is(batch2.getAttribute('TRANSLATION').getCount(), 2, 'batch 2 has 2 instances');
});

test('idempotence', async (t) => {
	const doc = new Document().setLogger(logger);

	await doc.transform(instance());

	t.is(doc.getRoot().listExtensionsUsed().length, 0, 'does not add EXT_mesh_gpu_instancing');

	const batchExtension = doc.createExtension(EXTMeshGPUInstancing);
	const batch = batchExtension.createInstancedMesh();
	const node = doc.createNode();
	node.setExtension('EXT_mesh_gpu_instancing', batch);

	await doc.transform(instance());

	t.is(doc.getRoot().listExtensionsUsed().length, 1, 'does not remove EXT_mesh_gpu_instancing');
});
