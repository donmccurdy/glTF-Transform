import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Accessor, Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshGPUInstancing, type InstancedMesh } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';

const WRITER_OPTIONS = { basename: 'extensionTest' };

const io = new NodeIO().registerExtensions([EXTMeshGPUInstancing]);

describe('extensions::EXTMeshGPUInstancing', () => {
	test('basic', async () => {
		const doc = new Document();
		const data = doc
			.createAccessor('unused')
			.setArray(new Float32Array(12))
			.setType(Accessor.Type.VEC3)
			.setBuffer(doc.createBuffer());

		// Create a non-instanced mesh primitive, and ensure its attributes are written into separate
		// buffer views from instance attributes.
		const prim = doc.createPrimitive().setAttribute('POSITION', data.clone().setName('prim_pos'));
		const mesh = doc.createMesh().addPrimitive(prim);

		const batchExtension = doc.createExtension(EXTMeshGPUInstancing);
		const batch = batchExtension
			.createInstancedMesh()
			.setAttribute('TRANSLATION', data.clone().setName('inst_pos'))
			.setAttribute('_CUSTOM', data.clone().setName('inst_cust'));

		const node = doc.createNode().setMesh(mesh).setExtension('EXT_mesh_gpu_instancing', batch);

		strictEqual(node.getExtension('EXT_mesh_gpu_instancing'), batch, 'batch is attached');

		const jsonDoc = await io.writeJSON(doc, WRITER_OPTIONS);
		const nodeDef = jsonDoc.json.nodes[0];

		strictEqual(jsonDoc.json.bufferViews.length, 3, 'creates three buffer views');
		deepEqual(
			nodeDef.extensions,
			{
				EXT_mesh_gpu_instancing: {
					attributes: { TRANSLATION: 2, _CUSTOM: 3 },
				},
			},
			'attaches batch',
		);
		strictEqual(jsonDoc.json.accessors[0].bufferView, 0, 'buffer view assignment (1/4)');
		strictEqual(jsonDoc.json.accessors[1].bufferView, 1, 'buffer view assignment (2/4)');
		strictEqual(jsonDoc.json.accessors[2].bufferView, 2, 'buffer view assignment (3/4)');
		strictEqual(jsonDoc.json.accessors[3].bufferView, 2, 'buffer view assignment (4/4)');

		const rtDoc = await io.readJSON(jsonDoc);
		const rtNode = rtDoc.getRoot().listNodes().pop();
		const batch2 = rtNode.getExtension<InstancedMesh>('EXT_mesh_gpu_instancing');

		deepEqual(batch.listSemantics(), batch2.listSemantics(), 'batches have same semantics');

		batchExtension.dispose();
		strictEqual(node.getExtension('EXT_mesh_gpu_instancing'), null, 'batch is detached');
	});

	test('copy', () => {
		const doc = new Document();
		const data = doc
			.createAccessor()
			.setArray(new Float32Array(12))
			.setType(Accessor.Type.VEC3)
			.setBuffer(doc.createBuffer());
		const batchExtension = doc.createExtension(EXTMeshGPUInstancing);
		const batch = batchExtension.createInstancedMesh().setAttribute('TRANSLATION', data).setAttribute('_ID', data);

		doc.createNode().setExtension('EXT_mesh_gpu_instancing', batch);

		const doc2 = cloneDocument(doc);
		const batch2 = doc2.getRoot().listNodes()[0].getExtension<InstancedMesh>('EXT_mesh_gpu_instancing');
		strictEqual(doc2.getRoot().listExtensionsUsed().length, 1, 'copy EXTMeshGPUInstancing');
		ok(batch2, 'copy batch');
		deepEqual(batch.listSemantics(), batch2.listSemantics(), 'matching semantics');
		deepEqual(batch.getAttribute('_ID').getArray(), new Float32Array(12), 'matching data');
	});
});
