import test from 'ava';
import { JSDOM } from 'jsdom';
import { Document } from '@gltf-transform/core';
import { DocumentView, NullImageProvider } from '@gltf-transform/view';

global.document = new JSDOM().window.document;
const imageProvider = new NullImageProvider();

test('MeshSubject', async (t) => {
	const document = new Document();
	const position = document
		.createAccessor()
		.setType('VEC3')
		.setArray(new Float32Array([0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0]));
	const primDef = document.createPrimitive().setAttribute('POSITION', position);
	const meshDef = document.createMesh().setName('MyMesh').addPrimitive(primDef);

	const documentView = new DocumentView(document, { imageProvider });
	const mesh = documentView.view(meshDef);

	t.is(mesh.name, 'MyMesh', 'mesh → name');

	meshDef.setName('MyMeshRenamed');
	t.is(mesh.name, 'MyMeshRenamed', 'mesh → name (2)');

	t.is(mesh.children[0].type, 'Mesh', 'mesh → prim (initial)');

	meshDef.removePrimitive(primDef);
	t.is(mesh.children.length, 0, 'mesh → prim (remove)');

	meshDef.addPrimitive(primDef);
	t.is(mesh.children.length, 1, 'mesh → prim (add)');
});
