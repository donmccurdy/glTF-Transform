import { Document, type vec3 } from '@gltf-transform/core';
import { quantize } from '@gltf-transform/functions';
import { logger } from '@gltf-transform/test-utils';
import test from 'ava';
import { createEdgePrimitive } from '../src/create-edge-primitive';

async function createGeometries(doc: Document, vertices: vec3[], indices: number[], quantized: boolean = false) {
	const node = doc.createNode('test-primitive-node');
	const mesh = doc.createMesh('test-primitive-mesh');
	const primitive = doc
		.createPrimitive()
		.setName('test-primitive')
		.setAttribute(
			'POSITION',
			doc.createAccessor('test-primitive-positions').setType('VEC3').setArray(new Float32Array(vertices.flat())),
		)
		.setIndices(doc.createAccessor('test-primitive-indices').setType('SCALAR').setArray(new Uint32Array(indices)));
	mesh.addPrimitive(primitive);
	node.setMesh(mesh);
	doc.createScene().addChild(node);
	if (quantized) {
		await doc.transform(
			quantize({
				quantizePosition: 8,
			}),
		);
	}
}

const vertices: vec3[] = [
	[0, 0, 0] as vec3,
	[1, 0, 0] as vec3,
	[1, 1, 0] as vec3,
	[0, 1, 0] as vec3,
	[1, 1, 1] as vec3,
];

const quantizeVertices: vec3[] = [
	[-0.19211, -0.93457, 0.29946],
	[-0.08526, -0.99393, 0.06957],
	[0.82905, -0.39715, 0],
];

function testEdge(doc: Document, vertices: vec3[], indices: number[], expectedLineCount: number, t) {}

test('primitiveOutline_zero0', async (t) => {
	const doc = new Document().setLogger(logger);
	await testEdges(doc, vertices, [1, 1, 1], 0, false, t);
});

test('primitiveOutline_zero1', async (t) => {
	const doc = new Document().setLogger(logger);
	await testEdges(doc, vertices, [0, 0, 1], 0, false, t);
});

test('primitiveOutline_2', async (t) => {
	const doc = new Document().setLogger(logger);
	await testEdges(doc, vertices, [0, 1, 2], 3, false, t);
});

test('quanztized_primitive_edge', async (t) => {
	const doc = new Document().setLogger(logger);
	await testEdges(doc, quantizeVertices, [0, 1, 2], 3, true, t);
});

async function testEdges(doc: Document, vertices: vec3[], indices: number[], edgesCount: number, quantize: boolean, t) {
	createGeometries(doc, vertices, indices, quantize);
	const root = doc.getRoot();
	if (quantize) {
		t.deepEqual(
			root.listExtensionsUsed().some((ext) => ext.extensionName === 'KHR_mesh_quantization'),
			true,
			'has quantization extension',
		);
	}
	const edgePrimitive = createEdgePrimitive(root.listMeshes()[0].listPrimitives()[0], 0.05);
	const lineCount = edgePrimitive.getAttribute('POSITION').getCount() / 2;
	t.deepEqual(lineCount, edgesCount, 'count edge line');
}
