import test from 'ava';
import { JSDOM } from 'jsdom';
import { Document } from '@gltf-transform/core';
import { DocumentView, NullImageProvider } from '@gltf-transform/view';

global.document = new JSDOM().window.document;
const imageProvider = new NullImageProvider();

test('NodeSubject', async (t) => {
	const document = new Document();
	const nodeDef1 = document
		.createNode('Node1')
		.setTranslation([0, 2, 0])
		.setRotation([0, 0, 0.707, 0.707])
		.setScale([0.5, 0.5, 0.5])
		.addChild(document.createNode('Node2').setTranslation([5, 0, 0]));

	const documentView = new DocumentView(document, { imageProvider });
	const node1 = documentView.view(nodeDef1);

	t.is(node1.name, 'Node1', 'node1 → name');
	t.is(node1.children.length, 1, 'node1 → children');
	t.deepEqual(node1.position.toArray(), [0, 2, 0], 'node1 → position');
	t.deepEqual(node1.quaternion.toArray(), [0, 0, 0.707, 0.707], 'node1 → quaternion');
	t.deepEqual(node1.scale.toArray(), [0.5, 0.5, 0.5], 'node1 → scale');

	const node2 = node1.children[0];
	t.is(node2.name, 'Node2', 'node2 → name');
	t.is(node2.children.length, 0, 'node2 → children');
	t.deepEqual(node2.position.toArray(), [5, 0, 0], 'node2 → position');
	t.deepEqual(node2.quaternion.toArray(), [0, 0, 0, 1], 'node2 → quaternion');
	t.deepEqual(node2.scale.toArray(), [1, 1, 1], 'node2 → scale');

	nodeDef1.setName('RenamedNode').setTranslation([0, 0, 0]);

	t.is(node1.name, 'RenamedNode', 'node1 → name');
	t.deepEqual(node1.position.toArray(), [0, 0, 0], 'node1 → position');
});

test('NodeSubject | update in place', async (t) => {
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

	t.truthy(scene, 'scene ok');
	t.truthy(node1, 'node1 ok');
	t.truthy(node2, 'node2 ok');
	t.truthy(mesh, 'mesh ok');

	t.is(scene.children[0], node2, 'node2 view');
	t.is(scene.children[0].children[0], node1, 'node1 view');
	t.is(scene.children[0].children[0].children[0], mesh, 'mesh view');

	nodeDef1.setScale([2, 2, 2]);
	nodeDef2.setScale([3, 3, 3]);

	t.is(scene.children[0], node2, 'node2 view after update');
	t.is(scene.children[0].children[0], node1, 'node1 view after update');
	t.is(scene.children[0].children[0].children[0], mesh, 'mesh view');

	t.deepEqual(node1.scale.toArray([]), [2, 2, 2], 'node1 scale');
	t.deepEqual(node2.scale.toArray([]), [3, 3, 3], 'node2 scale');

	t.truthy(
		node1.children.some((o) => o.name === 'Mesh.v1'),
		'node1.mesh.name',
	);
	t.truthy(
		node2.children.some((o) => o.name === 'Mesh.v1'),
		'node2.mesh.name',
	);
	meshDef.setName('Mesh.v2');
	t.truthy(
		node1.children.some((o) => o.name === 'Mesh.v2'),
		'node1.mesh.name',
	);
	t.truthy(
		node2.children.some((o) => o.name === 'Mesh.v2'),
		'node2.mesh.name',
	);
});
