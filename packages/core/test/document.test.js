require('source-map-support').install();

const test = require('tape');
const { Document } = require('../');

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
	doc1.createScene('MyScene');

	const doc2 = doc1.clone();

	t.equal(doc2.getRoot().listScenes()[0].getName(), 'MyScene', 'transfers scene')
	t.equal(doc2.getRoot().listMaterials()[0].getName(), 'MyMaterial', 'transfers material')
	t.notEqual(doc2.getRoot().listScenes()[0], doc1.getRoot().listScenes()[0], 'does not reference old scene');
	t.notEqual(doc2.getRoot().listMaterials()[0], doc1.getRoot().listMaterials()[0], 'does not reference old material');

	t.end();
});
