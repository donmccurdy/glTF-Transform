import test from 'ava';
import { Document, JSONDocument } from '@gltf-transform/core';
import { createPlatformIO } from '@gltf-transform/test-utils';

test('@gltf-transform/core::root', (t) => {
	const doc = new Document();
	const accessor = doc.createAccessor();
	const animation = doc.createAnimation();
	const buffer = doc.createBuffer();
	const camera = doc.createCamera();
	const material = doc.createMaterial();
	const mesh = doc.createMesh();
	const node = doc.createNode();
	const scene = doc.createScene();
	const skin = doc.createSkin();
	const texture = doc.createTexture();

	t.deepEqual(doc.getRoot().listAccessors(), [accessor], 'listAccessors()');
	t.deepEqual(doc.getRoot().listAnimations(), [animation], 'listAnimations()');
	t.deepEqual(doc.getRoot().listBuffers(), [buffer], 'listBuffers()');
	t.deepEqual(doc.getRoot().listCameras(), [camera], 'listCameras()');
	t.deepEqual(doc.getRoot().listMaterials(), [material], 'listMaterials()');
	t.deepEqual(doc.getRoot().listMeshes(), [mesh], 'listMeshes()');
	t.deepEqual(doc.getRoot().listNodes(), [node], 'listNodes()');
	t.deepEqual(doc.getRoot().listScenes(), [scene], 'listScenes()');
	t.deepEqual(doc.getRoot().listSkins(), [skin], 'listSkins()');
	t.deepEqual(doc.getRoot().listTextures(), [texture], 'listTextures()');

	const root2 = doc.clone().getRoot();
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
	t.throws(() => root2.copy(doc.getRoot()), undefined, 'no direct copy');
});

test('@gltf-transform/core::root | default scene', async (t) => {
	const doc = new Document();
	const root = doc.getRoot();
	const sceneA = doc.createScene('A');
	const sceneB = doc.createScene('B');
	const io = await createPlatformIO();

	t.is(root.getDefaultScene(), null, 'default scene initially null');

	root.setDefaultScene(sceneA);
	t.is(root.getDefaultScene(), sceneA, 'default scene = A');

	sceneA.dispose();
	t.is(root.getDefaultScene(), null, 'default scene disposed');

	root.setDefaultScene(sceneB);
	t.is(root.getDefaultScene(), sceneB, 'default scene = B');

	t.is(doc.clone().getRoot().getDefaultScene().getName(), 'B', 'clone / copy persistence');

	t.is(
		(await io.readJSON(await io.writeJSON(doc, {}))).getRoot().getDefaultScene().getName(),
		'B',
		'read / write persistence'
	);
});

test('@gltf-transform/core::root | clone child of root', (t) => {
	const doc = new Document();
	const a = doc.createAccessor();
	const b = a.clone();
	const c = b.clone();

	t.deepEqual(doc.getRoot().listAccessors(), [a, b, c], 'clones are attached to Root');
});

test('@gltf-transform/core::root | extras', async (t) => {
	const doc = new Document();
	const io = await createPlatformIO();

	const jsonDocNoExtras = await io.writeJSON(doc);
	doc.getRoot().setExtras({ custom: 'value' });
	const jsonDocExtras = await io.writeJSON(doc);

	const rtDocNoExtras = await io.readJSON(jsonDocNoExtras);
	const rtDocExtras = await io.readJSON(jsonDocExtras);

	t.is(jsonDocNoExtras.json.extras, undefined, 'no empty extras');
	t.deepEqual(jsonDocExtras.json.extras, { custom: 'value' }, 'write extras');
	t.deepEqual(rtDocNoExtras.getRoot().getExtras(), {}, 'round trip no extras');
	t.deepEqual(rtDocExtras.getRoot().getExtras(), { custom: 'value' }, 'round trip extras');
});

test('@gltf-transform/core::root | asset', async (t) => {
	const doc = new Document();
	const root = doc.getRoot();
	const io = await createPlatformIO();

	let jsonDoc: JSONDocument;
	let generator: string;

	jsonDoc = await io.writeJSON(doc);
	generator = jsonDoc.json.asset.generator;
	t.true(/^glTF-Transform.*/i.test(generator), 'write default generator');

	root.getAsset().generator = 'Custom Tool v123';
	jsonDoc = await io.writeJSON(doc);
	generator = jsonDoc.json.asset.generator;
	t.true(/^Custom Tool.*/i.test(generator), 'write custom generator');

	generator = (await io.readJSON(jsonDoc)).getRoot().getAsset().generator;
	t.true(/^glTF-Transform.*/i.test(generator), 'read default generator');
});
