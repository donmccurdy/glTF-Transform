import { strictEqual } from 'node:assert/strict';
import { test } from 'node:test';
import { Document, type Node } from '@gltf-transform/core';
import { DocumentView, NullImageProvider } from '@gltf-transform/view';
import { JSDOM } from 'jsdom';

global.document = new JSDOM().window.document;
const imageProvider = new NullImageProvider();

test('SceneSubject', async () => {
	const document = new Document();
	let nodeDef: Node;
	const sceneDef = document
		.createScene('MyScene')
		.addChild(document.createNode('Node1'))
		.addChild((nodeDef = document.createNode('Node2')))
		.addChild(document.createNode('Node3'));
	nodeDef.addChild(document.createNode('Node4'));

	const documentView = new DocumentView(document, { imageProvider });
	const scene = documentView.view(sceneDef);

	strictEqual(scene.name, 'MyScene', 'scene → name');
	sceneDef.setName('MySceneRenamed');
	strictEqual(scene.name, 'MySceneRenamed', 'scene → name (renamed)');
	strictEqual(scene.children.length, 3, 'scene → children → 3');

	strictEqual(scene.children[1].children[0].name, 'Node4', 'scene → ... → grandchild');
	nodeDef.listChildren()[0].dispose();
	strictEqual(scene.children[1].children.length, 0, 'scene → ... → grandchild (dispose)');

	nodeDef.dispose();
	strictEqual(scene.children.length, 2, 'scene → children → 2');
	sceneDef.removeChild(sceneDef.listChildren()[0]);
	strictEqual(scene.children.length, 1, 'scene → children → 1');
});
