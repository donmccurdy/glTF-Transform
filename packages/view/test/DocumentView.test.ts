import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document } from '@gltf-transform/core';
import { DocumentView, NullImageProvider } from '@gltf-transform/view';
import { JSDOM } from 'jsdom';
import { type BufferGeometry, Group, type Mesh, type MeshStandardMaterial, type Texture } from 'three';

global.document = new JSDOM().window.document;
const imageProvider = new NullImageProvider();

describe('view::DocumentView', () => {
	test('constructor', () => {
		ok(new DocumentView(new Document(), { imageProvider }), 'constructor');
	});

	test('view', async () => {
		const document = new Document();
		const textureDef = document.createTexture();
		const materialDef = document
			.createMaterial()
			.setBaseColorTexture(textureDef)
			.setMetallicRoughnessTexture(textureDef);
		const primDef = document.createPrimitive().setMaterial(materialDef);
		const meshDef = document.createMesh().addPrimitive(primDef);
		const nodeDef = document.createNode().setMesh(meshDef);
		const sceneDef = document.createScene().addChild(nodeDef);

		const documentView = new DocumentView(document, { imageProvider });

		const scene = documentView.view(sceneDef);
		const node = scene.children[0];
		const mesh = node.children[0];
		const prim = mesh.children[0] as Mesh<BufferGeometry, MeshStandardMaterial>;
		let material = prim.material;
		let texture = material.map as Texture;

		ok(scene instanceof Group, 'scene → THREE.Group');
		deepEqual(documentView.listViews(sceneDef), [scene], 'scene views');
		strictEqual(documentView.listViews(nodeDef).length, 1, 'node views');
		strictEqual(documentView.listViews(meshDef).length, 1, 'mesh views');
		// 1 external prim, 1 internal prim. See SingleUserPool.
		strictEqual(documentView.listViews(primDef).length, 2, 'prim views');
		strictEqual(documentView.listViews(materialDef).length, 1, 'material views');
		strictEqual(documentView.listViews(textureDef).length, 2, 'texture views');
		strictEqual(documentView.getProperty(scene), sceneDef, 'scene → source');
		strictEqual(documentView.getProperty(node), nodeDef, 'node → source');
		strictEqual(documentView.getProperty(mesh), meshDef, 'mesh → source');
		strictEqual(documentView.getProperty(prim), primDef, 'prim → source');
		strictEqual(documentView.getProperty(material), materialDef, 'material → source');
		strictEqual(documentView.getProperty(texture), textureDef, 'texture → source');

		material = documentView.view(materialDef) as MeshStandardMaterial;
		strictEqual(material.type, 'MeshStandardMaterial', 'material → THREE.MeshStandardMaterial');
		strictEqual(documentView.listViews(materialDef).length, 2, 'material views');
		strictEqual(documentView.listViews(textureDef).length, 2, 'texture views');
		strictEqual(documentView.getProperty(material), materialDef, 'material → source');

		texture = documentView.view(textureDef);
		ok(texture.isTexture, 'texture → THREE.Texture');
		strictEqual(documentView.listViews(textureDef).length, 3, 'texture views');
		strictEqual(documentView.getProperty(texture), textureDef, 'texture → source');
	});

	test('dispose', async () => {
		const document = new Document();
		const texDef1 = document.createTexture('Tex1').setMimeType('image/png').setImage(new Uint8Array(0));
		const texDef2 = document.createTexture('Tex2').setMimeType('image/png').setImage(new Uint8Array(0));
		const materialDef = document
			.createMaterial('Material')
			.setBaseColorTexture(texDef1)
			.setEmissiveTexture(texDef2);
		const primDef = document.createPrimitive().setMaterial(materialDef);
		const sceneDef = document
			.createScene('Scene')
			.addChild(document.createNode('Node').setMesh(document.createMesh('Mesh').addPrimitive(primDef)));

		const documentView = new DocumentView(document, { imageProvider });
		const scene = documentView.view(sceneDef);
		const mesh = scene.getObjectByName('Mesh')!.children[0] as Mesh<BufferGeometry, MeshStandardMaterial>;
		const { geometry, material } = mesh;
		const { map, emissiveMap } = material as { map: Texture; emissiveMap: Texture };

		const disposed = new Set();
		geometry.addEventListener('dispose', () => disposed.add(geometry));
		material.addEventListener('dispose', () => disposed.add(material));
		map.addEventListener('dispose', () => disposed.add(map));
		emissiveMap.addEventListener('dispose', () => disposed.add(emissiveMap));

		strictEqual(disposed.size, 0, 'initial resources');

		documentView.dispose();

		strictEqual(disposed.size, 4);
		ok(disposed.has(geometry), 'disposed geometry');
		ok(disposed.has(material), 'disposed material');
		ok(disposed.has(map), 'disposed baseColorTexture');
		ok(disposed.has(emissiveMap), 'disposed emissiveTexture');
	});

	test('alloc', async () => {
		// Parts of this test are subjective — we don't *really* need to keep a Mesh
		// in memory if the MeshDef is unused — but it's important that the counts
		// come to zero when things are disposed. And if these results change
		// unintentionally, that's a good time to review side effects.

		const document = new Document();
		const positionDef = document
			.createAccessor()
			.setType('VEC3')
			.setArray(new Float32Array([0, 0, 0]));
		const primDef = document.createPrimitive().setAttribute('POSITION', positionDef);
		const meshDef = document.createMesh().addPrimitive(primDef);
		const nodeDef = document.createNode();
		const sceneDef = document.createScene().addChild(nodeDef);

		const documentView = new DocumentView(document, { imageProvider });

		deepEqual(
			getPartialStats(documentView),
			{
				scenes: 0,
				nodes: 0,
				meshes: 0,
				primitives: 0,
			},
			'1. empty',
		);

		documentView.view(sceneDef);

		deepEqual(
			getPartialStats(documentView),
			{
				scenes: 1,
				nodes: 1,
				meshes: 0,
				primitives: 0,
			},
			'2. no mesh',
		);

		nodeDef.setMesh(meshDef);

		deepEqual(
			getPartialStats(documentView),
			{
				scenes: 1,
				nodes: 1,
				meshes: 2, // 1 internal, 1 view
				primitives: 2, // 1 internal, 1 view
			},
			'3. add mesh',
		);

		nodeDef.setMesh(null);
		nodeDef.setMesh(meshDef);
		nodeDef.setMesh(null);
		nodeDef.setMesh(meshDef);
		nodeDef.setMesh(null);
		nodeDef.setMesh(meshDef);

		deepEqual(
			getPartialStats(documentView),
			{
				scenes: 1,
				nodes: 1,
				meshes: 5, // garbage accumulation
				primitives: 2,
			},
			'4. garbage accumulation',
		);

		documentView.gc();

		deepEqual(
			getPartialStats(documentView),
			{
				scenes: 1,
				nodes: 1,
				meshes: 2, // garbage collection
				primitives: 2,
			},
			'5. garbage collection pt 1',
		);

		nodeDef.setMesh(null);
		documentView.gc();

		deepEqual(
			getPartialStats(documentView),
			{
				scenes: 1,
				nodes: 1,
				meshes: 1, // garbage collection
				primitives: 2,
			},
			'5. garbage collection pt 2',
		);

		primDef.dispose();
		meshDef.dispose();
		documentView.gc();

		deepEqual(
			getPartialStats(documentView),
			{
				scenes: 1,
				nodes: 1,
				meshes: 0, // garbage collection
				primitives: 0, // garbage collection
			},
			'5. garbage collection pt 2',
		);
	});
});

interface PartialStats {
	scenes: number;
	nodes: number;
	meshes: number;
	primitives: number;
}

function getPartialStats(view: DocumentView): PartialStats {
	const { scenes, nodes, meshes, primitives } = view.stats();
	return { scenes, nodes, meshes, primitives };
}
