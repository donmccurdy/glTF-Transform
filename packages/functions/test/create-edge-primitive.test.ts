import { Document, type vec3 } from '@gltf-transform/core';
import { logger } from '@gltf-transform/test-utils';
import test from 'ava';
import { createEdgePrimitive } from '../src/primitive-outline';

function createGeometries(doc: Document, vertices: vec3[], indices: number[]) {
	const node = doc.createNode('test-primitive-node');
	const mesh = doc.createMesh('test-primitive-mesh');
	const primitive = doc
		.createPrimitive()
		.setName('test-primitive')
		.setAttribute(
			'POSITION',
			doc.createAccessor('test-primitive-positions').setArray(new Float32Array(vertices.flat())),
		)
		.setIndices(doc.createAccessor('test-primitive-indices').setArray(new Uint32Array(indices)));
	mesh.addPrimitive(primitive);
	node.setMesh(mesh);
	doc.createScene().addChild(node);
}

const vertices: vec3[] = [
	[0, 0, 0] as vec3,
	[1, 0, 0] as vec3,
	[1, 1, 0] as vec3,
	[0, 1, 0] as vec3,
	[1, 1, 1] as vec3,
];

function testEdge(doc: Document, vertices: vec3[], indices: number[], expectedLineCount: number, t) {}

test('primitiveOutline_zero0', async (t) => {
	const doc = new Document().setLogger(logger);
	await testEdges(doc, [1, 1, 1], 0, t);
});

test('primitiveOutline_zero1', async (t) => {
	const doc = new Document().setLogger(logger);
	await testEdges(doc, [0, 0, 1], 0, t);
});

test('primitiveOutline_2', async (t) => {
	const doc = new Document().setLogger(logger);
	await testEdges(doc, [0, 1, 2], 3, t);
});

async function testEdges(doc: Document, indices: number[], edgesCount: number, t) {
	createGeometries(doc, vertices, indices);
	const root = doc.getRoot();
	const edgePrimitive = createEdgePrimitive(root.listMeshes()[0].listPrimitives()[0], 0.05);
	const lineCount = edgePrimitive.getAttribute('POSITION').getCount() / 2;
	t.deepEqual(lineCount, edgesCount, 'count edge line');
}
