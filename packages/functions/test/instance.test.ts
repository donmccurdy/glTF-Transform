import { deepEqual, notStrictEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document } from '@gltf-transform/core';
import { EXTMeshGPUInstancing, type InstancedMesh } from '@gltf-transform/extensions';
import { instance } from '@gltf-transform/functions';
import { createTorusKnotPrimitive, logger } from '@gltf-transform/test-utils';

describe('functions::instance', () => {
	test('translation', async () => {
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

		strictEqual(root.listNodes().length, 1, 'creates batch node');
		strictEqual(root.listScenes()[0].listChildren().length, 1, 'attaches batch node');
		ok(node1.isDisposed(), 'disposed node (1/3)');
		ok(node2.isDisposed(), 'disposed node (2/3)');
		ok(node3.isDisposed(), 'disposed node (3/3)');

		const batchNode = root.listNodes()[0];
		const batch = batchNode.getExtension<InstancedMesh>('EXT_mesh_gpu_instancing');

		ok(batch, 'creates batch');
		deepEqual(
			batch.getAttribute('TRANSLATION').getArray(),
			new Float32Array([0, 0, 0, 0, 0, 1, 0, 0, 2]),
			'sets batch translation',
		);
		strictEqual(batch.getAttribute('TRANSLATION').getBuffer(), buffer, 'sets batch buffer');
		strictEqual(batch.getAttribute('ROTATION'), null, 'skips batch rotation');
		strictEqual(batch.getAttribute('SCALE'), null, 'skips batch scale');
	});

	test('rotation', async () => {
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

		strictEqual(root.listNodes().length, 1, 'creates batch node');
		strictEqual(root.listScenes()[0].listChildren().length, 1, 'attaches batch node');
		ok(node1.isDisposed(), 'disposed node (1/3)');
		ok(node2.isDisposed(), 'disposed node (2/3)');
		ok(node3.isDisposed(), 'disposed node (3/3)');

		const batchNode = root.listNodes()[0];
		const batch = batchNode.getExtension<InstancedMesh>('EXT_mesh_gpu_instancing');

		ok(batch, 'creates batch');
		deepEqual(
			batch.getAttribute('ROTATION').getArray(),
			new Float32Array([0, 0, 0, 1, x, 0, 0, x, 0, x, 0, x]),
			'sets batch rotation',
		);
		strictEqual(batch.getAttribute('ROTATION').getBuffer(), buffer, 'sets batch buffer');
		strictEqual(batch.getAttribute('TRANSLATION'), null, 'skips batch translation');
		strictEqual(batch.getAttribute('SCALE'), null, 'skips batch scale');
	});

	test('scale', async () => {
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

		strictEqual(root.listNodes().length, 1, 'creates batch node');
		strictEqual(root.listScenes()[0].listChildren().length, 1, 'attaches batch node');
		ok(node1.isDisposed(), 'disposed node (1/3)');
		ok(node2.isDisposed(), 'disposed node (2/3)');
		ok(node3.isDisposed(), 'disposed node (3/3)');

		const batchNode = root.listNodes()[0];
		const batch = batchNode.getExtension<InstancedMesh>('EXT_mesh_gpu_instancing');

		ok(batch, 'creates batch');
		deepEqual(
			batch.getAttribute('SCALE').getArray(),
			new Float32Array([1, 1, 1, 2, 2, 2, 1, 1, 5]),
			'sets batch scale',
		);
		strictEqual(batch.getAttribute('SCALE').getBuffer(), buffer, 'sets batch buffer');
		strictEqual(batch.getAttribute('TRANSLATION'), null, 'skips batch translation');
		strictEqual(batch.getAttribute('ROTATION'), null, 'skips batch rotation');
	});

	test('skip distinct meshes', async () => {
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

		strictEqual(root.listNodes().length, 3, 'keeps original nodes');
		strictEqual(node1.isDisposed(), false, 'node (1/3)');
		strictEqual(node2.isDisposed(), false, 'node (2/3)');
		strictEqual(node3.isDisposed(), false, 'node (3/3)');

		const batchNode = root.listNodes()[0];
		const batch = batchNode.getExtension<InstancedMesh>('EXT_mesh_gpu_instancing');

		strictEqual(batch, null, 'does not create batch');
	});

	test('skip existing instances', async () => {
		const document = new Document().setLogger(logger);
		const root = document.getRoot();

		const batchExtension = document.createExtension(EXTMeshGPUInstancing);
		const batch = batchExtension.createInstancedMesh();

		const prim = createTorusKnotPrimitive(document, { radialSegments: 4, tubularSegments: 6 });
		const mesh = document.createMesh().addPrimitive(prim);
		const node1 = document.createNode().setMesh(mesh).setExtension('EXT_mesh_gpu_instancing', batch);
		const node2 = document.createNode().setMesh(mesh).setTranslation([0, 0, 0]);
		const node3 = document.createNode().setMesh(mesh).setTranslation([10, 0, 0]);

		document.createScene().addChild(node1).addChild(node2).addChild(node3);

		await document.transform(instance({ min: 2 }));

		strictEqual(root.listNodes().length, 2, 'keeps 2/3 nodes');

		const [batch1, batch2] = root
			.listNodes()
			.map((node) => node.getExtension<InstancedMesh>('EXT_mesh_gpu_instancing'));

		strictEqual(batch, batch1, 'keeps batch 1');
		ok(batch2, 'creates batch 2');
		notStrictEqual(batch1, batch2, 'batches are not merged');
		strictEqual(batch2.getAttribute('TRANSLATION').getCount(), 2, 'batch 2 has 2 instances');
	});

	test('idempotence', async () => {
		const doc = new Document().setLogger(logger);

		await doc.transform(instance());

		strictEqual(doc.getRoot().listExtensionsUsed().length, 0, 'does not add EXT_mesh_gpu_instancing');

		const batchExtension = doc.createExtension(EXTMeshGPUInstancing);
		const batch = batchExtension.createInstancedMesh();
		const node = doc.createNode();
		node.setExtension('EXT_mesh_gpu_instancing', batch);

		await doc.transform(instance());

		strictEqual(doc.getRoot().listExtensionsUsed().length, 1, 'does not remove EXT_mesh_gpu_instancing');
	});
});
