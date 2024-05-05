import test from 'ava';
import { JSDOM } from 'jsdom';
import { Document } from '@gltf-transform/core';
import { EXTMeshGPUInstancing } from '@gltf-transform/extensions';
import { DocumentView, NullImageProvider } from '@gltf-transform/view';
import { Group, InstancedMesh, Object3D } from 'three';

global.document = new JSDOM().window.document;
const imageProvider = new NullImageProvider();

test('InstancedMeshSubject', async (t) => {
	const document = new Document();
	const batchExt = document.createExtension(EXTMeshGPUInstancing);
	const batchTranslation = document
		.createAccessor()
		.setType('VEC3')
		.setArray(new Float32Array([0, 0, 0, 10, 0, 0, 20, 0, 0]));
	const batchDef = batchExt.createInstancedMesh().setAttribute('TRANSLATION', batchTranslation);
	const position = document
		.createAccessor()
		.setType('VEC3')
		.setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]));
	const primDef = document.createPrimitive().setAttribute('POSITION', position);
	const meshDef = document.createMesh().addPrimitive(primDef);
	const nodeDef = document.createNode().setMesh(meshDef).setExtension('EXT_mesh_gpu_instancing', batchDef);

	const documentView = new DocumentView(document, { imageProvider });
	const node = documentView.view(nodeDef);
	const group = node.children[0] as Group;
	const mesh = group.children[0] as InstancedMesh;

	t.deepEqual(node.children.map(toType), ['Group'], 'node.children → [Group]');
	t.deepEqual(group.children.map(toType), ['Mesh'], 'group.children → [Mesh]');
	t.is(mesh.isInstancedMesh, true, 'isInstancedMesh → true');
	t.is(mesh.count, 3, 'count → 3');
});

function toType(object: Object3D): string {
	return object.type;
}
