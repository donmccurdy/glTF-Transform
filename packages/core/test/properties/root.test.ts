require('source-map-support').install();

import test from 'tape';
import { Document, JSONDocument, NodeIO, Root } from '../../';

test('@gltf-transform/core::root', t => {
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

	const root2 = new Root(doc.getGraph()).copy(doc.getRoot(), (o) => o);
	t.deepEqual(root2.listAccessors(), [accessor], 'listAccessors()');
	t.deepEqual(root2.listAnimations(), [animation], 'listAnimations()');
	t.deepEqual(root2.listBuffers(), [buffer], 'listBuffers()');
	t.deepEqual(root2.listCameras(), [camera], 'listCameras()');
	t.deepEqual(root2.listMaterials(), [material], 'listMaterials()');
	t.deepEqual(root2.listMeshes(), [mesh], 'listMeshes()');
	t.deepEqual(root2.listNodes(), [node], 'listNodes()');
	t.deepEqual(root2.listScenes(), [scene], 'listScenes()');
	t.deepEqual(root2.listSkins(), [skin], 'listSkins()');
	t.deepEqual(root2.listTextures(), [texture], 'listTextures()');

	t.throws(() => root2.clone(), 'no cloning');
	t.throws(() => root2.copy(doc.getRoot()), 'no direct copy');
	t.end();
});

test('@gltf-transform/core::root | default scene', t => {
	const doc = new Document();
	const root = doc.getRoot();
	const sceneA = doc.createScene('A');
	const sceneB = doc.createScene('B');
	const io = new NodeIO();

	t.equals(root.getDefaultScene(), null, 'default scene initially null');

	root.setDefaultScene(sceneA);
	t.equals(root.getDefaultScene(), sceneA, 'default scene = A');

	sceneA.dispose();
	t.equals(root.getDefaultScene(), null, 'default scene disposed');

	root.setDefaultScene(sceneB);
	t.equals(root.getDefaultScene(), sceneB, 'default scene = B');

	t.equals(doc.clone().getRoot().getDefaultScene().getName(), 'B', 'clone / copy persistence');

	t.equals(
		io.readJSON(io.writeJSON(doc, {})).getRoot().getDefaultScene().getName(),
		'B',
		'read / write persistence'
	);

	t.end();
});

test('@gltf-transform/core::root | clone child of root', t => {
	const doc = new Document();
	const a = doc.createAccessor();
	const b = a.clone();
	const c = b.clone();

	t.deepEqual(doc.getRoot().listAccessors(), [a, b, c], 'clones are attached to Root');
	t.end();
});

test('@gltf-transform/core::root | extras', t => {
	const doc = new Document();
	const io = new NodeIO();

	const jsonDocNoExtras = io.writeJSON(doc);
	doc.getRoot().setExtras({custom: 'value'});
	const jsonDocExtras = io.writeJSON(doc);

	const rtDocNoExtras = io.readJSON(jsonDocNoExtras);
	const rtDocExtras = io.readJSON(jsonDocExtras);

	t.equals(jsonDocNoExtras.json.extras, undefined, 'no empty extras');
	t.deepEquals(jsonDocExtras.json.extras, {custom: 'value'}, 'write extras');
	t.deepEquals(rtDocNoExtras.getRoot().getExtras(), {}, 'round trip no extras');
	t.deepEquals(rtDocExtras.getRoot().getExtras(), {custom: 'value'}, 'round trip extras');
	t.end();
});

test('@gltf-transform/core::root | asset', t => {
	const doc = new Document();
	const root = doc.getRoot();
	const io = new NodeIO();

	let jsonDoc: JSONDocument;
	let generator: string;

	jsonDoc = io.writeJSON(doc);
	generator = jsonDoc.json.asset.generator;
	t.match(generator, /^glTF-Transform.*/i, 'write default generator');

	root.getAsset().generator = 'Custom Tool v123';
	jsonDoc = io.writeJSON(doc);
	generator = jsonDoc.json.asset.generator;
	t.match(generator, /^Custom Tool.*/i, 'write custom generator');

	generator = io.readJSON(jsonDoc).getRoot().getAsset().generator;
	t.match(generator, /^glTF-Transform.*/i, 'read default generator');
	t.end();
});
