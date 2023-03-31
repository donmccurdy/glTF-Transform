import test from 'ava';
import { Document } from '@gltf-transform/core';

test('transform', async (t) => {
	const document = new Document();

	await document.transform(
		(c) => c.createTexture(''),
		(c) => c.createBuffer('')
	);

	t.is(document.getRoot().listTextures().length, 1, 'transform 1');
	t.is(document.getRoot().listBuffers().length, 1, 'transform 2');
});

test('clone', (t) => {
	const document1 = new Document();
	document1.createMaterial('MyMaterial');
	const rootNode = document1.createNode('A').addChild(document1.createNode('B').addChild(document1.createNode('C')));
	document1.createScene('MyScene').addChild(rootNode);

	const document2 = document1.clone();

	t.is(document2.getRoot().listScenes()[0].getName(), 'MyScene', 'transfers scene');
	t.is(document2.getRoot().listScenes()[0].listChildren().length, 1, 'transfers scene root node');
	t.is(document2.getRoot().listNodes().length, 3, 'transfers nodes');
	t.is(document2.getRoot().listNodes()[0].listChildren().length, 1, 'transfers node hierarchy (1/3)');
	t.is(document2.getRoot().listNodes()[1].listChildren().length, 1, 'transfers node hierarchy (2/3)');
	t.is(document2.getRoot().listNodes()[2].listChildren().length, 0, 'transfers node hierarchy (3/3)');
	t.is(document2.getRoot().listMaterials()[0].getName(), 'MyMaterial', 'transfers material');
	t.not(document2.getRoot().listScenes()[0], document1.getRoot().listScenes()[0], 'does not reference old scene');
	t.not(
		document2.getRoot().listMaterials()[0],
		document1.getRoot().listMaterials()[0],
		'does not reference old material'
	);
});

test('defaults', (t) => {
	// offering to the code coverage gods.
	const document = new Document();

	document.createAccessor('test');
	document.createAnimation('test');
	document.createAnimationChannel('test');
	document.createAnimationSampler('test');
	document.createBuffer('test');
	document.createCamera('test');
	document.createMesh('test');
	document.createNode('test');
	document.createPrimitive();
	document.createPrimitiveTarget('test');
	document.createScene('test');
	document.createSkin('test');

	t.truthy(true);
});
