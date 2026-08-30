import { ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, Primitive as PrimitiveDef } from '@gltf-transform/core';
import { KHRMaterialsClearcoat, KHRMaterialsUnlit } from '@gltf-transform/extensions';
import { DocumentView, NullImageProvider } from '@gltf-transform/view';
import { JSDOM } from 'jsdom';
import type {
	BufferGeometry,
	LineBasicMaterial,
	LineSegments,
	Mesh,
	MeshStandardMaterial,
	Points,
	PointsMaterial,
	Texture,
} from 'three';

global.document = new JSDOM().window.document;
const imageProvider = new NullImageProvider();

describe('view::MaterialSubject', () => {
	test('basic', async () => {
		const document = new Document();
		const texDef1 = document.createTexture('Tex1').setMimeType('image/png').setImage(new Uint8Array(0));
		const texDef2 = document.createTexture('Tex2').setMimeType('image/png').setImage(new Uint8Array(0));
		const materialDef = document
			.createMaterial('Material')
			.setBaseColorTexture(texDef1)
			.setEmissiveTexture(texDef2);
		const primDef = document.createPrimitive().setMaterial(materialDef);
		const meshDef = document.createMesh('Mesh').addPrimitive(primDef);
		const nodeDef = document.createNode('Node').setMesh(meshDef);
		const sceneDef = document.createScene('Scene').addChild(nodeDef);

		const documentView = new DocumentView(document, { imageProvider });
		const scene = documentView.view(sceneDef);
		let mesh = scene.children[0].children[0].children[0] as Mesh<BufferGeometry, MeshStandardMaterial>;
		let material = mesh.material;

		strictEqual(material.name, 'Material', 'material.name → Material');
		strictEqual(material.type, 'MeshStandardMaterial', 'material.type → MeshStandardMaterial');
		ok(material.map, 'material.map → ok');
		ok(material.emissiveMap, 'material.emissiveMap → ok');

		texDef1.dispose();
		mesh = scene.children[0].children[0].children[0] as Mesh<BufferGeometry, MeshStandardMaterial>;
		material = mesh.material;

		strictEqual(material.map, null, 'material.map → null');
		ok(material.emissiveMap, 'material.emissiveMap → ok');
	});

	test('extensions', async () => {
		const document = new Document();
		const unlitExtension = document.createExtension(KHRMaterialsUnlit);
		const clearcoatExtension = document.createExtension(KHRMaterialsClearcoat);

		const materialDef = document.createMaterial('Material');
		const documentView = new DocumentView(document, { imageProvider });

		let material = documentView.view(materialDef);

		strictEqual(material.type, 'MeshStandardMaterial', 'MeshStandardMaterial');

		materialDef.setExtension('KHR_materials_unlit', unlitExtension.createUnlit());
		material = documentView.view(materialDef);

		strictEqual(material.type, 'MeshBasicMaterial', 'MeshBasicMaterial');

		materialDef.setExtension('KHR_materials_unlit', null);
		material = documentView.view(materialDef);

		strictEqual(material.type, 'MeshStandardMaterial', 'MeshStandardMaterial');

		materialDef.setExtension('KHR_materials_clearcoat', clearcoatExtension.createClearcoat());
		material = documentView.view(materialDef);

		strictEqual(material.type, 'MeshPhysicalMaterial', 'MeshPhysicalMaterial');
	});

	test('dispose', async () => {
		const document = new Document();
		const texDef1 = document.createTexture('Tex1').setMimeType('image/png').setImage(new Uint8Array(0));
		const texDef2 = document.createTexture('Tex2').setMimeType('image/png').setImage(new Uint8Array(0));
		const materialDef = document
			.createMaterial('Material')
			.setBaseColorTexture(texDef1)
			.setEmissiveTexture(texDef2);
		const meshPrimDef = document.createPrimitive().setMode(PrimitiveDef.Mode.TRIANGLES).setMaterial(materialDef);
		const pointsPrimDef = document.createPrimitive().setMode(PrimitiveDef.Mode.POINTS).setMaterial(materialDef);
		const meshDef = document.createMesh('Mesh').addPrimitive(meshPrimDef).addPrimitive(pointsPrimDef);
		const sceneDef = document.createScene('Scene').addChild(document.createNode('Node').setMesh(meshDef));

		const documentView = new DocumentView(document, { imageProvider });
		const scene = documentView.view(sceneDef);
		const [mesh, points] = scene.getObjectByName('Mesh')!.children as [Mesh, Points];
		const meshMaterial = mesh.material as MeshStandardMaterial;
		const pointsMaterial = points.material as PointsMaterial;

		const disposed = new Set();
		meshMaterial.addEventListener('dispose', () => disposed.add(meshMaterial));
		pointsMaterial.addEventListener('dispose', () => disposed.add(pointsMaterial));

		strictEqual(disposed.size, 0, 'initial values');
		strictEqual(meshMaterial.type, 'MeshStandardMaterial', 'creates MeshStandardMaterial');
		strictEqual(pointsMaterial.type, 'PointsMaterial', 'creates PointsMaterial');

		meshPrimDef.setMaterial(null);
		documentView.gc();

		strictEqual(disposed.size, 1, 'dispose count (1/3)');
		ok(disposed.has(meshMaterial), 'dispose MeshStandardMaterial');

		pointsPrimDef.setMode(PrimitiveDef.Mode.LINES);
		documentView.gc();

		strictEqual(disposed.size, 2, 'dispose count (2/3)');
		ok(disposed.has(pointsMaterial), 'dispose PointsMaterial');

		const [_, lines] = scene.getObjectByName('Mesh')!.children as [unknown, LineSegments];
		const lineMaterial = lines.material as LineBasicMaterial;
		lineMaterial.addEventListener('dispose', () => disposed.add(lineMaterial));

		strictEqual(lineMaterial.type, 'LineBasicMaterial', 'creates LineBasicMaterial');

		materialDef.dispose();
		documentView.gc();

		strictEqual(disposed.size, 3, 'dispose count (3/3)');
		ok(disposed.has(pointsMaterial), 'dispose LineBasicMaterial');
	});

	test('texture memory', async () => {
		const document = new Document();
		const clearcoatExtension = document.createExtension(KHRMaterialsClearcoat);
		const texDef1 = document.createTexture('Tex1').setMimeType('image/png').setImage(new Uint8Array(0));
		const texDef2 = document.createTexture('Tex2').setMimeType('image/png').setImage(new Uint8Array(0));
		const materialDef = document
			.createMaterial('Material')
			.setBaseColorTexture(texDef1)
			.setEmissiveTexture(texDef2);

		const documentView = new DocumentView(document, { imageProvider });
		let material = documentView.view(materialDef);
		const { map, emissiveMap } = material as unknown as {
			map: Texture;
			emissiveMap: Texture;
		};

		strictEqual(material.type, 'MeshStandardMaterial', 'original material');
		ok(map.source === emissiveMap.source, 'map.source === emissiveMap.source');

		const baseVersion = map.version;
		strictEqual(map.version, baseVersion, 'map.version');
		strictEqual(emissiveMap.version, baseVersion, 'emissiveMap.version');

		materialDef.setExtension('KHR_materials_clearcoat', clearcoatExtension.createClearcoat());
		material = documentView.view(materialDef);

		strictEqual(material.type, 'MeshPhysicalMaterial', 'new material');
		ok(map.source === emissiveMap.source, 'map.source === emissiveMap.source');
		strictEqual(map.version, baseVersion, 'map.version');
		strictEqual(emissiveMap.version, baseVersion, 'emissiveMap.version');
	});
});
