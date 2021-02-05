require('source-map-support').install();

import test from 'tape';
import { Document, Logger } from '@gltf-transform/core';
import { InstancedMesh } from '@gltf-transform/extensions';
import { instance } from '../';

test('@gltf-transform/lib::instance | translation', async t => {
	const doc = new Document().setLogger(new Logger(Logger.Verbosity.SILENT));
	const root = doc.getRoot();
	const buffer = doc.createBuffer();
	const prim = doc.createPrimitive()
		.setAttribute('POSITION', doc.createAccessor().setBuffer(buffer));
	const mesh = doc.createMesh().addPrimitive(prim);
	const node1 = doc.createNode().setMesh(mesh).setTranslation([0, 0, 0]);
	const node2 = doc.createNode().setMesh(mesh).setTranslation([0, 0, 1]);
	const node3 = doc.createNode().setMesh(mesh).setTranslation([0, 0, 2]);
	doc.createScene().addChild(node1).addChild(node2).addChild(node3);

	await doc.transform((instance()));

	t.equals(root.listNodes().length, 1, 'creates batch node');
	t.equals(root.listScenes()[0].listChildren().length, 1, 'attaches batch node');
	t.ok(node1.isDisposed(), 'disposed node (1/3)');
	t.ok(node2.isDisposed(), 'disposed node (2/3)');
	t.ok(node3.isDisposed(), 'disposed node (3/3)');

	const batchNode = root.listNodes()[0];
	const batch = batchNode.getExtension<InstancedMesh>('EXT_mesh_gpu_instancing');

	t.ok(batch, 'creates batch');
	t.deepEqual(
		batch.getAttribute('TRANSLATION').getArray(),
		new Float32Array([0, 0, 0, 0, 0, 1, 0, 0, 2]),
		'sets batch translation'
	);
	t.equal(batch.getAttribute('TRANSLATION').getBuffer(), buffer, 'sets batch buffer');
	t.notOk(batch.getAttribute('ROTATION'), 'skips batch rotation');
	t.notOk(batch.getAttribute('SCALE'), 'skips batch scale');
	t.end();
});

test('@gltf-transform/lib::instance | rotation', async t => {
	const doc = new Document().setLogger(new Logger(Logger.Verbosity.SILENT));
	const root = doc.getRoot();
	const buffer = doc.createBuffer();
	const prim = doc.createPrimitive()
		.setAttribute('POSITION', doc.createAccessor().setBuffer(buffer));
	const mesh = doc.createMesh().addPrimitive(prim);
	const x = Math.sqrt(.5);
	const node1 = doc.createNode().setMesh(mesh).setRotation([0, 0, 0, 1]);
	const node2 = doc.createNode().setMesh(mesh).setRotation([x, 0, 0, x]);
	const node3 = doc.createNode().setMesh(mesh).setRotation([0, x, 0, x]);
	doc.createScene().addChild(node1).addChild(node2).addChild(node3);

	await doc.transform((instance()));

	t.equals(root.listNodes().length, 1, 'creates batch node');
	t.equals(root.listScenes()[0].listChildren().length, 1, 'attaches batch node');
	t.ok(node1.isDisposed(), 'disposed node (1/3)');
	t.ok(node2.isDisposed(), 'disposed node (2/3)');
	t.ok(node3.isDisposed(), 'disposed node (3/3)');

	const batchNode = root.listNodes()[0];
	const batch = batchNode.getExtension<InstancedMesh>('EXT_mesh_gpu_instancing');

	t.ok(batch, 'creates batch');
	t.deepEqual(
		batch.getAttribute('ROTATION').getArray(),
		new Float32Array([0, 0, 0, 1, x, 0, 0, x, 0, x, 0, x]),
		'sets batch rotation'
	);
	t.equal(batch.getAttribute('ROTATION').getBuffer(), buffer, 'sets batch buffer');
	t.notOk(batch.getAttribute('TRANSLATION'), 'skips batch translation');
	t.notOk(batch.getAttribute('SCALE'), 'skips batch scale');
	t.end();
});

test('@gltf-transform/lib::instance | scale', async t => {
	const doc = new Document().setLogger(new Logger(Logger.Verbosity.SILENT));
	const root = doc.getRoot();
	const buffer = doc.createBuffer();
	const prim = doc.createPrimitive()
		.setAttribute('POSITION', doc.createAccessor().setBuffer(buffer));
	const mesh = doc.createMesh().addPrimitive(prim);
	const node1 = doc.createNode().setMesh(mesh).setScale([1, 1, 1]);
	const node2 = doc.createNode().setMesh(mesh).setScale([2, 2, 2]);
	const node3 = doc.createNode().setMesh(mesh).setScale([1, 1, 5]);
	doc.createScene().addChild(node1).addChild(node2).addChild(node3);

	await doc.transform((instance()));

	t.equals(root.listNodes().length, 1, 'creates batch node');
	t.equals(root.listScenes()[0].listChildren().length, 1, 'attaches batch node');
	t.ok(node1.isDisposed(), 'disposed node (1/3)');
	t.ok(node2.isDisposed(), 'disposed node (2/3)');
	t.ok(node3.isDisposed(), 'disposed node (3/3)');

	const batchNode = root.listNodes()[0];
	const batch = batchNode.getExtension<InstancedMesh>('EXT_mesh_gpu_instancing');

	t.ok(batch, 'creates batch');
	t.deepEqual(
		batch.getAttribute('SCALE').getArray(),
		new Float32Array([1, 1, 1, 2, 2, 2, 1, 1, 5]),
		'sets batch scale'
	);
	t.equal(batch.getAttribute('SCALE').getBuffer(), buffer, 'sets batch buffer');
	t.notOk(batch.getAttribute('TRANSLATION'), 'skips batch translation');
	t.notOk(batch.getAttribute('ROTATION'), 'skips batch rotation');
	t.end();
});

test('@gltf-transform/lib::instance | scale', async t => {
	const doc = new Document().setLogger(new Logger(Logger.Verbosity.SILENT));
	const root = doc.getRoot();
	const buffer = doc.createBuffer();
	const prim = doc.createPrimitive()
		.setAttribute('POSITION', doc.createAccessor().setBuffer(buffer));
	const mesh = doc.createMesh().addPrimitive(prim);
	const node1 = doc.createNode().setMesh(mesh).setScale([1, 1, 1]);
	const node2 = doc.createNode().setMesh(mesh.clone()).setScale([2, 2, 2]);
	const node3 = doc.createNode().setMesh(mesh.clone()).setScale([1, 1, 5]);
	doc.createScene().addChild(node1).addChild(node2).addChild(node3);

	await doc.transform((instance()));

	t.equals(root.listNodes().length, 3, 'keeps original nodes');
	t.notOk(node1.isDisposed(), 'node (1/3)');
	t.notOk(node2.isDisposed(), 'node (2/3)');
	t.notOk(node3.isDisposed(), 'node (3/3)');

	const batchNode = root.listNodes()[0];
	const batch = batchNode.getExtension<InstancedMesh>('EXT_mesh_gpu_instancing');

	t.notOk(batch, 'does not create batch');
	t.end();
});
