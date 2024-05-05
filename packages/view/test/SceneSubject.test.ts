import test from 'ava';
import { JSDOM } from 'jsdom';
import { Document, Node } from '@gltf-transform/core';
import { DocumentView, NullImageProvider } from '@gltf-transform/view';

global.document = new JSDOM().window.document;
const imageProvider = new NullImageProvider();

test('SceneBinding', async (t) => {
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

	t.is(scene.name, 'MyScene', 'scene → name');
	sceneDef.setName('MySceneRenamed');
	t.is(scene.name, 'MySceneRenamed', 'scene → name (renamed)');
	t.is(scene.children.length, 3, 'scene → children → 3');

	t.is(scene.children[1].children[0].name, 'Node4', 'scene → ... → grandchild');
	nodeDef.listChildren()[0].dispose();
	t.is(scene.children[1].children.length, 0, 'scene → ... → grandchild (dispose)');

	nodeDef.dispose();
	t.is(scene.children.length, 2, 'scene → children → 2');
	sceneDef.removeChild(sceneDef.listChildren()[0]);
	t.is(scene.children.length, 1, 'scene → children → 1');
});
