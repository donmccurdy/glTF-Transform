import { strictEqual } from 'node:assert/strict';
import { test } from 'node:test';
import { Document } from '@gltf-transform/core';
import { DocumentView, NullImageProvider } from '@gltf-transform/view';
import { JSDOM } from 'jsdom';

global.document = new JSDOM().window.document;
const imageProvider = new NullImageProvider();

test('MeshSubject', async () => {
	const document = new Document();
	const position = document
		.createAccessor()
		.setType('VEC3')
		.setArray(new Float32Array([0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0]));
	const primDef = document.createPrimitive().setAttribute('POSITION', position);
	const meshDef = document.createMesh().setName('MyMesh').addPrimitive(primDef);

	const documentView = new DocumentView(document, { imageProvider });
	const mesh = documentView.view(meshDef);

	strictEqual(mesh.name, 'MyMesh', 'mesh → name');

	meshDef.setName('MyMeshRenamed');
	strictEqual(mesh.name, 'MyMeshRenamed', 'mesh → name (2)');

	strictEqual(mesh.children[0].type, 'Mesh', 'mesh → prim (initial)');

	meshDef.removePrimitive(primDef);
	strictEqual(mesh.children.length, 0, 'mesh → prim (remove)');

	meshDef.addPrimitive(primDef);
	strictEqual(mesh.children.length, 1, 'mesh → prim (add)');
});
