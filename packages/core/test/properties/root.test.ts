import test from 'ava';
import { Document, JSONDocument } from '@gltf-transform/core';
import { cloneDocument } from '@gltf-transform/functions';
import { createPlatformIO } from '@gltf-transform/test-utils';

test('basic', (t) => {
	const document = new Document();
	const accessor = document.createAccessor();
	const animation = document.createAnimation();
	const buffer = document.createBuffer();
	const camera = document.createCamera();
	const material = document.createMaterial();
	const mesh = document.createMesh();
	const node = document.createNode();
	const scene = document.createScene();
	const skin = document.createSkin();
	const texture = document.createTexture();

	t.deepEqual(document.getRoot().listAccessors(), [accessor], 'listAccessors()');
	t.deepEqual(document.getRoot().listAnimations(), [animation], 'listAnimations()');
	t.deepEqual(document.getRoot().listBuffers(), [buffer], 'listBuffers()');
	t.deepEqual(document.getRoot().listCameras(), [camera], 'listCameras()');
	t.deepEqual(document.getRoot().listMaterials(), [material], 'listMaterials()');
	t.deepEqual(document.getRoot().listMeshes(), [mesh], 'listMeshes()');
	t.deepEqual(document.getRoot().listNodes(), [node], 'listNodes()');
	t.deepEqual(document.getRoot().listScenes(), [scene], 'listScenes()');
	t.deepEqual(document.getRoot().listSkins(), [skin], 'listSkins()');
	t.deepEqual(document.getRoot().listTextures(), [texture], 'listTextures()');

	const root2 = cloneDocument(document).getRoot();
	t.deepEqual(root2.listAccessors().length, 1, 'listAccessors()');
	t.deepEqual(root2.listAnimations().length, 1, 'listAnimations()');
	t.deepEqual(root2.listBuffers().length, 1, 'listBuffers()');
	t.deepEqual(root2.listCameras().length, 1, 'listCameras()');
	t.deepEqual(root2.listMaterials().length, 1, 'listMaterials()');
	t.deepEqual(root2.listMeshes().length, 1, 'listMeshes()');
	t.deepEqual(root2.listNodes().length, 1, 'listNodes()');
	t.deepEqual(root2.listScenes().length, 1, 'listScenes()');
	t.deepEqual(root2.listSkins().length, 1, 'listSkins()');
	t.deepEqual(root2.listTextures().length, 1, 'listTextures()');

	t.throws(() => root2.clone(), undefined, 'no cloning');
	t.throws(() => root2.copy(document.getRoot()), undefined, 'no direct copy');
});

test('default scene', async (t) => {
	const document = new Document();
	const root = document.getRoot();
	const sceneA = document.createScene('A');
	const sceneB = document.createScene('B');
	const io = await createPlatformIO();

	t.is(root.getDefaultScene(), null, 'default scene initially null');

	root.setDefaultScene(sceneA);
	t.is(root.getDefaultScene(), sceneA, 'default scene = A');

	sceneA.dispose();
	t.is(root.getDefaultScene(), null, 'default scene disposed');

	root.setDefaultScene(sceneB);
	t.is(root.getDefaultScene(), sceneB, 'default scene = B');

	t.is(cloneDocument(document).getRoot().getDefaultScene().getName(), 'B', 'clone / copy persistence');

	t.is(
		(await io.readJSON(await io.writeJSON(document, {}))).getRoot().getDefaultScene().getName(),
		'B',
		'read / write persistence',
	);
});

test('clone child of root', (t) => {
	const document = new Document();
	const a = document.createAccessor();
	const b = a.clone();
	const c = b.clone();

	t.deepEqual(document.getRoot().listAccessors(), [a, b, c], 'clones are attached to Root');
});

test('extras', async (t) => {
	const document = new Document();
	const io = await createPlatformIO();

	const jsonDocNoExtras = await io.writeJSON(document);
	document.getRoot().setExtras({ custom: 'value' });
	const jsonDocExtras = await io.writeJSON(document);

	const rtDocNoExtras = await io.readJSON(jsonDocNoExtras);
	const rtDocExtras = await io.readJSON(jsonDocExtras);

	t.is(jsonDocNoExtras.json.extras, undefined, 'no empty extras');
	t.deepEqual(jsonDocExtras.json.extras, { custom: 'value' }, 'write extras');
	t.deepEqual(rtDocNoExtras.getRoot().getExtras(), {}, 'round trip no extras');
	t.deepEqual(rtDocExtras.getRoot().getExtras(), { custom: 'value' }, 'round trip extras');
});

test('asset', async (t) => {
	const document = new Document();
	const root = document.getRoot();
	const io = await createPlatformIO();

	let jsonDoc: JSONDocument;
	let generator: string;

	jsonDoc = await io.writeJSON(document);
	generator = jsonDoc.json.asset.generator;
	t.true(/^glTF-Transform.*/i.test(generator), 'write default generator');

	root.getAsset().generator = 'Custom Tool v123';
	jsonDoc = await io.writeJSON(document);
	generator = jsonDoc.json.asset.generator;
	t.true(/^Custom Tool.*/i.test(generator), 'write custom generator');

	generator = (await io.readJSON(jsonDoc)).getRoot().getAsset().generator;
	t.true(/^glTF-Transform.*/i.test(generator), 'read default generator');
});
