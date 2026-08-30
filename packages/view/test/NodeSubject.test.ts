import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document } from '@gltf-transform/core';
import { DocumentView, NullImageProvider } from '@gltf-transform/view';
import { JSDOM } from 'jsdom';

global.document = new JSDOM().window.document;
const imageProvider = new NullImageProvider();

describe('view::NodeSubject', () => {
	test('basic', async () => {
		const document = new Document();
		const nodeDef1 = document
			.createNode('Node1')
			.setTranslation([0, 2, 0])
			.setRotation([0, 0, 0.707, 0.707])
			.setScale([0.5, 0.5, 0.5])
			.addChild(document.createNode('Node2').setTranslation([5, 0, 0]));

		const documentView = new DocumentView(document, { imageProvider });
		const node1 = documentView.view(nodeDef1);

		strictEqual(node1.name, 'Node1', 'node1 → name');
		strictEqual(node1.children.length, 1, 'node1 → children');
		deepEqual(node1.position.toArray(), [0, 2, 0], 'node1 → position');
		deepEqual(node1.quaternion.toArray(), [0, 0, 0.707, 0.707], 'node1 → quaternion');
		deepEqual(node1.scale.toArray(), [0.5, 0.5, 0.5], 'node1 → scale');

		const node2 = node1.children[0];
		strictEqual(node2.name, 'Node2', 'node2 → name');
		strictEqual(node2.children.length, 0, 'node2 → children');
		deepEqual(node2.position.toArray(), [5, 0, 0], 'node2 → position');
		deepEqual(node2.quaternion.toArray(), [0, 0, 0, 1], 'node2 → quaternion');
		deepEqual(node2.scale.toArray(), [1, 1, 1], 'node2 → scale');

		nodeDef1.setName('RenamedNode').setTranslation([0, 0, 0]);

		strictEqual(node1.name, 'RenamedNode', 'node1 → name');
		deepEqual(node1.position.toArray(), [0, 0, 0], 'node1 → position');
	});

	test('update in place', async () => {
		const document = new Document();
		const meshDef = document.createMesh().setName('Mesh.v1');
		const nodeDef1 = document.createNode('Node1').setMesh(meshDef);
		const nodeDef2 = document.createNode('Node2').setMesh(meshDef).addChild(nodeDef1);
		const sceneDef = document.createScene().addChild(nodeDef2);

		const documentView = new DocumentView(document, { imageProvider });
		const scene = documentView.view(sceneDef);
		const node1 = documentView.view(nodeDef1);
		const node2 = documentView.view(nodeDef2);
		const mesh = node1.children[0];

		ok(scene, 'scene ok');
		ok(node1, 'node1 ok');
		ok(node2, 'node2 ok');
		ok(mesh, 'mesh ok');

		strictEqual(scene.children[0], node2, 'node2 view');
		strictEqual(scene.children[0].children[0], node1, 'node1 view');
		strictEqual(scene.children[0].children[0].children[0], mesh, 'mesh view');

		nodeDef1.setScale([2, 2, 2]);
		nodeDef2.setScale([3, 3, 3]);

		strictEqual(scene.children[0], node2, 'node2 view after update');
		strictEqual(scene.children[0].children[0], node1, 'node1 view after update');
		strictEqual(scene.children[0].children[0].children[0], mesh, 'mesh view');

		deepEqual(node1.scale.toArray([]), [2, 2, 2], 'node1 scale');
		deepEqual(node2.scale.toArray([]), [3, 3, 3], 'node2 scale');

		ok(
			node1.children.some((o) => o.name === 'Mesh.v1'),
			'node1.mesh.name',
		);
		ok(
			node2.children.some((o) => o.name === 'Mesh.v1'),
			'node2.mesh.name',
		);
		meshDef.setName('Mesh.v2');
		ok(
			node1.children.some((o) => o.name === 'Mesh.v2'),
			'node1.mesh.name',
		);
		ok(
			node2.children.some((o) => o.name === 'Mesh.v2'),
			'node2.mesh.name',
		);
	});
});
