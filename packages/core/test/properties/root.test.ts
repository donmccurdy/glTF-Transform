import { deepEqual, ok, strictEqual, throws } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, type JSONDocument } from '@gltf-transform/core';
import { cloneDocument } from '@gltf-transform/functions';
import { createPlatformIO } from '@gltf-transform/test-utils';

describe('core::Root', () => {
	test('basic', () => {
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

		deepEqual(document.getRoot().listAccessors(), [accessor], 'listAccessors()');
		deepEqual(document.getRoot().listAnimations(), [animation], 'listAnimations()');
		deepEqual(document.getRoot().listBuffers(), [buffer], 'listBuffers()');
		deepEqual(document.getRoot().listCameras(), [camera], 'listCameras()');
		deepEqual(document.getRoot().listMaterials(), [material], 'listMaterials()');
		deepEqual(document.getRoot().listMeshes(), [mesh], 'listMeshes()');
		deepEqual(document.getRoot().listNodes(), [node], 'listNodes()');
		deepEqual(document.getRoot().listScenes(), [scene], 'listScenes()');
		deepEqual(document.getRoot().listSkins(), [skin], 'listSkins()');
		deepEqual(document.getRoot().listTextures(), [texture], 'listTextures()');

		const root2 = cloneDocument(document).getRoot();
		deepEqual(root2.listAccessors().length, 1, 'listAccessors()');
		deepEqual(root2.listAnimations().length, 1, 'listAnimations()');
		deepEqual(root2.listBuffers().length, 1, 'listBuffers()');
		deepEqual(root2.listCameras().length, 1, 'listCameras()');
		deepEqual(root2.listMaterials().length, 1, 'listMaterials()');
		deepEqual(root2.listMeshes().length, 1, 'listMeshes()');
		deepEqual(root2.listNodes().length, 1, 'listNodes()');
		deepEqual(root2.listScenes().length, 1, 'listScenes()');
		deepEqual(root2.listSkins().length, 1, 'listSkins()');
		deepEqual(root2.listTextures().length, 1, 'listTextures()');

		throws(() => root2.clone(), undefined, 'no cloning');
		throws(() => root2.copy(document.getRoot()), undefined, 'no direct copy');
	});

	test('default scene', async () => {
		const document = new Document();
		const root = document.getRoot();
		const sceneA = document.createScene('A');
		const sceneB = document.createScene('B');
		const io = await createPlatformIO();

		strictEqual(root.getDefaultScene(), null, 'default scene initially null');

		root.setDefaultScene(sceneA);
		strictEqual(root.getDefaultScene(), sceneA, 'default scene = A');

		sceneA.dispose();
		strictEqual(root.getDefaultScene(), null, 'default scene disposed');

		root.setDefaultScene(sceneB);
		strictEqual(root.getDefaultScene(), sceneB, 'default scene = B');

		strictEqual(cloneDocument(document).getRoot().getDefaultScene().getName(), 'B', 'clone / copy persistence');

		strictEqual(
			(await io.readJSON(await io.writeJSON(document, {}))).getRoot().getDefaultScene().getName(),
			'B',
			'read / write persistence',
		);
	});

	test('clone child of root', () => {
		const document = new Document();
		const a = document.createAccessor();
		const b = a.clone();
		const c = b.clone();

		deepEqual(document.getRoot().listAccessors(), [a, b, c], 'clones are attached to Root');
	});

	test('extras', async () => {
		const document = new Document();
		const io = await createPlatformIO();

		const jsonDocNoExtras = await io.writeJSON(document);
		document.getRoot().setExtras({ custom: 'value' });
		const jsonDocExtras = await io.writeJSON(document);

		const rtDocNoExtras = await io.readJSON(jsonDocNoExtras);
		const rtDocExtras = await io.readJSON(jsonDocExtras);

		strictEqual(jsonDocNoExtras.json.extras, undefined, 'no empty extras');
		deepEqual(jsonDocExtras.json.extras, { custom: 'value' }, 'write extras');
		deepEqual(rtDocNoExtras.getRoot().getExtras(), {}, 'round trip no extras');
		deepEqual(rtDocExtras.getRoot().getExtras(), { custom: 'value' }, 'round trip extras');
	});

	test('asset', async () => {
		const document = new Document();
		const root = document.getRoot();
		const io = await createPlatformIO();

		let jsonDoc: JSONDocument;
		let generator: string;

		jsonDoc = await io.writeJSON(document);
		generator = jsonDoc.json.asset.generator;
		ok(/^glTF-Transform.*/i.test(generator), 'write default generator');

		root.getAsset().generator = 'Custom Tool v123';
		jsonDoc = await io.writeJSON(document);
		generator = jsonDoc.json.asset.generator;
		ok(/^Custom Tool.*/i.test(generator), 'write custom generator');

		generator = (await io.readJSON(jsonDoc)).getRoot().getAsset().generator;
		ok(/^glTF-Transform.*/i.test(generator), 'read default generator');
	});
});
