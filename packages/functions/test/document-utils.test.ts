import test from 'ava';
import { Document, Property } from '@gltf-transform/core';
import { KHRMaterialsUnlit, KHRTextureTransform, Transform, Unlit } from '@gltf-transform/extensions';
import { cloneDocument, copyToDocument, mergeDocuments, moveToDocument, prune } from '@gltf-transform/functions';
import { createTorusKnotPrimitive, logger } from '@gltf-transform/test-utils';

test('cloneDocument', (t) => {
	const document1 = new Document().setLogger(logger);
	document1.createMaterial('MyMaterial');
	const rootNode = document1.createNode('A').addChild(document1.createNode('B').addChild(document1.createNode('C')));
	document1.createScene('MyScene').addChild(rootNode);

	const document2 = cloneDocument(document1);

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
		'does not reference old material',
	);
});

test('mergeDocuments - scenes', (t) => {
	const targetDocument = new Document().setLogger(logger);
	targetDocument.createScene('SceneA');
	const sourceDocument = new Document().setLogger(logger);
	sourceDocument.createScene('SceneB');

	mergeDocuments(targetDocument, sourceDocument);

	const toName = (prop: Property) => prop.getName();
	t.deepEqual(targetDocument.getRoot().listScenes().map(toName), ['SceneA', 'SceneB'], 'target.scenes');
	t.deepEqual(sourceDocument.getRoot().listScenes().map(toName), ['SceneB'], 'source.scenes');
});

test('mergeDocuments - generator', (t) => {
	const targetDocument = new Document().setLogger(logger);
	targetDocument.getRoot().getAsset().generator = 'GeneratorA';
	const sourceDocument = new Document().setLogger(logger);
	sourceDocument.getRoot().getAsset().generator = 'GeneratorB';

	mergeDocuments(targetDocument, sourceDocument);

	t.is(targetDocument.getRoot().getAsset().generator, 'GeneratorA', 'target.asset.generator');
	t.is(sourceDocument.getRoot().getAsset().generator, 'GeneratorB', 'source.asset.generator');
});

test('copyToDocument - basic', async (t) => {
	const srcDocument = new Document().setLogger(logger);
	const dstDocument = new Document().setLogger(logger);

	const srcPrim = createTorusKnotPrimitive(srcDocument, { tubularSegments: 6 });
	const srcPosition = srcPrim.getAttribute('POSITION');
	const srcMesh = srcDocument.createMesh('TorusMesh').addPrimitive(srcPrim);
	const srcNode = srcDocument.createNode('TorusNode').setMesh(srcMesh);
	const srcScene = srcDocument.createScene().addChild(srcNode);

	const map = copyToDocument(dstDocument, srcDocument, [srcMesh]);
	await srcDocument.transform(prune({ keepLeaves: true }));

	t.false(srcPosition.isDisposed(), 'srcPosition ok');
	t.false(srcPrim.isDisposed(), 'srcPrim ok');
	t.false(srcMesh.isDisposed(), 'srcMesh ok');
	t.false(srcNode.isDisposed(), 'srcNode ok');
	t.false(srcScene.isDisposed(), 'srcScene ok');

	const dstMesh = dstDocument.getRoot().listMeshes()[0];
	const dstPrim = dstMesh.listPrimitives()[0];
	const dstPosition = dstPrim.getAttribute('POSITION');

	t.is(dstMesh.getName(), 'TorusMesh', 'dstMesh.name');
	t.is(map.get(srcMesh), dstMesh, 'mesh <-> mesh');
	t.is(map.get(srcPrim), dstPrim, 'prim <-> prim');
	t.is(map.get(srcPosition), dstPosition, 'position <-> position');
	t.is(map.has(srcNode), false, 'node <-> null');
	t.is(map.has(srcScene), false, 'scene <-> null');
});

test('copyToDocument - unsupported', async (t) => {
	const srcDocument = new Document().setLogger(logger);
	const dstDocument = new Document().setLogger(logger);

	const srcRoot = srcDocument.getRoot();
	const srcTexture = srcDocument.createTexture();
	const srcTextureInfo = srcDocument.createMaterial().setBaseColorTexture(srcTexture).getBaseColorTextureInfo()!;

	t.throws(() => void copyToDocument(dstDocument, srcDocument, [srcRoot]));
	t.throws(() => void copyToDocument(dstDocument, srcDocument, [srcTextureInfo]));
});

test('copyToDocument - material', async (t) => {
	const srcDocument = new Document().setLogger(logger);
	const dstDocument = new Document().setLogger(logger);

	const unlitExtension = srcDocument.createExtension(KHRMaterialsUnlit);
	const unlit = unlitExtension.createUnlit();

	const transformExtension = srcDocument.createExtension(KHRTextureTransform);
	const transform = transformExtension.createTransform().setScale([2, 2]);

	dstDocument.createExtension(KHRMaterialsUnlit);
	dstDocument.createExtension(KHRTextureTransform);

	const srcTexture = srcDocument.createTexture();
	const srcMaterial = srcDocument
		.createMaterial()
		.setBaseColorFactor([0.5, 0, 0, 1])
		.setBaseColorTexture(srcTexture)
		.setExtension('KHR_materials_unlit', unlit);
	srcMaterial.getBaseColorTextureInfo()!.setExtension('KHR_texture_transform', transform);

	copyToDocument(dstDocument, srcDocument, [srcMaterial]);

	const dstMaterial = dstDocument.getRoot().listMaterials()[0];
	const dstTextureInfo = dstMaterial.getBaseColorTextureInfo();
	const dstTransform = dstTextureInfo.getExtension<Transform>('KHR_texture_transform');

	t.deepEqual(dstMaterial.getBaseColorFactor(), [0.5, 0, 0, 1], 'baseColorFactor');
	t.true(dstMaterial.getExtension('KHR_materials_unlit') instanceof Unlit, 'unlit');
	t.true(dstTransform instanceof Transform, 'transform');
	t.deepEqual(dstTransform.getScale(), [2, 2], 'transform.scale');
});

test('moveToDocument - basic', async (t) => {
	const srcDocument = new Document().setLogger(logger);
	const dstDocument = new Document().setLogger(logger);

	const srcPrim = createTorusKnotPrimitive(srcDocument, { tubularSegments: 6 });
	const srcPosition = srcPrim.getAttribute('POSITION');
	const srcMesh = srcDocument.createMesh('TorusMesh').addPrimitive(srcPrim);
	const srcNode = srcDocument.createNode('TorusNode').setMesh(srcMesh);
	const srcScene = srcDocument.createScene().addChild(srcNode);

	const map = moveToDocument(dstDocument, srcDocument, [srcMesh]);
	await srcDocument.transform(prune({ keepLeaves: true }));

	t.true(srcPosition.isDisposed(), 'srcPosition disposed');
	t.true(srcPrim.isDisposed(), 'srcPrim disposed');
	t.true(srcMesh.isDisposed(), 'srcMesh disposed');
	t.false(srcNode.isDisposed(), 'srcNode ok');
	t.false(srcScene.isDisposed(), 'srcScene ok');

	const dstMesh = dstDocument.getRoot().listMeshes()[0];
	const dstPrim = dstMesh.listPrimitives()[0];
	const dstPosition = dstPrim.getAttribute('POSITION');

	t.is(dstMesh.getName(), 'TorusMesh', 'dstMesh.name');
	t.is(map.get(srcMesh), dstMesh, 'mesh <-> mesh');
	t.is(map.get(srcPrim), dstPrim, 'prim <-> prim');
	t.is(map.get(srcPosition), dstPosition, 'position <-> position');
	t.is(map.has(srcNode), false, 'node <-> null');
	t.is(map.has(srcScene), false, 'scene <-> null');
});

test('moveToDocument - unsupported', async (t) => {
	const srcDocument = new Document().setLogger(logger);
	const dstDocument = new Document().setLogger(logger);

	const srcRoot = srcDocument.getRoot();
	const srcTexture = srcDocument.createTexture();
	const srcTextureInfo = srcDocument.createMaterial().setBaseColorTexture(srcTexture).getBaseColorTextureInfo()!;

	t.throws(() => void moveToDocument(dstDocument, srcDocument, [srcRoot]));
	t.throws(() => void moveToDocument(dstDocument, srcDocument, [srcTextureInfo]));
});
