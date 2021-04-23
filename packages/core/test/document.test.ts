require('source-map-support').install();

import test from 'tape';
import { Document } from '../';

test('@gltf-transform/core::document | transform', async t => {
	const doc = new Document();

	await doc.transform(
		(c) => c.createTexture(''),
		(c) => c.createBuffer(''),
	);

	t.equals(doc.getRoot().listTextures().length, 1, 'transform 1');
	t.equals(doc.getRoot().listBuffers().length, 1, 'transform 2');

	t.end();
});

test('@gltf-transform/core::document | clone', t => {
	const doc1 = new Document();
	doc1.createMaterial('MyMaterial');
	const rootNode = doc1.createNode('A')
		.addChild(doc1.createNode('B')
			.addChild(doc1.createNode('C')));
	doc1.createScene('MyScene').addChild(rootNode);


	const doc2 = doc1.clone();

	t.equal(doc2.getRoot().listScenes()[0].getName(), 'MyScene', 'transfers scene');
	t.equal(doc2.getRoot().listScenes()[0].listChildren().length, 1, 'transfers scene root node');
	t.equal(doc2.getRoot().listNodes().length, 3, 'transfers nodes');
	t.equal(
		doc2.getRoot().listNodes()[0].listChildren().length,
		1,
		'transfers node hierarchy (1/3)'
	);
	t.equal(
		doc2.getRoot().listNodes()[1].listChildren().length,
		1,
		'transfers node hierarchy (2/3)'
	);
	t.equal(
		doc2.getRoot().listNodes()[2].listChildren().length,
		0,
		'transfers node hierarchy (3/3)'
	);
	t.equal(
		doc2.getRoot().listMaterials()[0].getName(),
		'MyMaterial',
		'transfers material'
	);
	t.notEqual(
		doc2.getRoot().listScenes()[0],
		doc1.getRoot().listScenes()[0],
		'does not reference old scene'
	);
	t.notEqual(
		doc2.getRoot().listMaterials()[0],
		doc1.getRoot().listMaterials()[0],
		'does not reference old material'
	);

	t.end();
});

test('@gltf-transform/core::document | defaults', t => {
	// offering to the code coverage gods.
	const doc = new Document();

	doc.createAccessor('test');
	doc.createAnimation('test');
	doc.createAnimationChannel('test');
	doc.createAnimationSampler('test');
	doc.createBuffer('test');
	doc.createCamera('test');
	doc.createMesh('test');
	doc.createNode('test');
	doc.createPrimitive();
	doc.createPrimitiveTarget('test');
	doc.createScene('test');
	doc.createSkin('test');

	t.ok(true);
	t.end();
});
