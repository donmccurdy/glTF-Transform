require('source-map-support').install();

import test from 'tape';
import { Accessor, Document, NodeIO } from '@gltf-transform/core';
import { InstancedMesh, MeshGPUInstancing } from '../';

const WRITER_OPTIONS = { basename: 'extensionTest' };

const io = new NodeIO().registerExtensions([MeshGPUInstancing]);

test('@gltf-transform/extensions::mesh-gpu-instancing', async (t) => {
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

	const batchExtension = doc.createExtension(MeshGPUInstancing);
	const batch = batchExtension
		.createInstancedMesh()
		.setAttribute('TRANSLATION', data.clone().setName('inst_pos'))
		.setAttribute('_CUSTOM', data.clone().setName('inst_cust'));

	const node = doc.createNode().setMesh(mesh).setExtension('EXT_mesh_gpu_instancing', batch);

	t.equal(node.getExtension('EXT_mesh_gpu_instancing'), batch, 'batch is attached');

	const jsonDoc = await io.writeJSON(doc, WRITER_OPTIONS);
	const nodeDef = jsonDoc.json.nodes[0];

	t.equal(jsonDoc.json.bufferViews.length, 3, 'creates three buffer views');
	t.deepEqual(
		nodeDef.extensions,
		{
			EXT_mesh_gpu_instancing: {
				attributes: { TRANSLATION: 0, _CUSTOM: 1 },
			},
		},
		'attaches batch'
	);
	t.equal(jsonDoc.json.accessors[0].bufferView, 0, 'buffer view assignment (1/4)');
	t.equal(jsonDoc.json.accessors[1].bufferView, 0, 'buffer view assignment (2/4)');
	t.equal(jsonDoc.json.accessors[2].bufferView, 1, 'buffer view assignment (3/4)');
	t.equal(jsonDoc.json.accessors[3].bufferView, 2, 'buffer view assignment (4/4)');

	const rtDoc = await io.readJSON(jsonDoc);
	const rtNode = rtDoc.getRoot().listNodes().pop();
	const batch2 = rtNode.getExtension<InstancedMesh>('EXT_mesh_gpu_instancing');

	t.deepEqual(batch.listSemantics(), batch2.listSemantics(), 'batches have same semantics');

	batchExtension.dispose();
	t.equal(node.getExtension('EXT_mesh_gpu_instancing'), null, 'batch is detached');
	t.end();
});

test('@gltf-transform/extensions::mesh-gpu-instancing | copy', (t) => {
	const doc = new Document();
	const data = doc
		.createAccessor()
		.setArray(new Float32Array(12))
		.setType(Accessor.Type.VEC3)
		.setBuffer(doc.createBuffer());
	const batchExtension = doc.createExtension(MeshGPUInstancing);
	const batch = batchExtension.createInstancedMesh().setAttribute('TRANSLATION', data).setAttribute('_ID', data);

	doc.createNode().setExtension('EXT_mesh_gpu_instancing', batch);

	const doc2 = doc.clone();
	const batch2 = doc2.getRoot().listNodes()[0].getExtension<InstancedMesh>('EXT_mesh_gpu_instancing');
	t.equals(doc2.getRoot().listExtensionsUsed().length, 1, 'copy MeshGPUInstancing');
	t.ok(batch2, 'copy batch');
	t.deepEqual(batch.listSemantics(), batch2.listSemantics(), 'matching semantics');
	t.deepEqual(batch.getAttribute('_ID').getArray(), new Float32Array(12), 'matching data');
	t.end();
});
