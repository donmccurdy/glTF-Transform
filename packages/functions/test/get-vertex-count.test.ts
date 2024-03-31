import test from 'ava';
import { Document, Scene } from '@gltf-transform/core';
import { EXTMeshGPUInstancing } from '@gltf-transform/extensions';
import { getSceneVertexCount, VertexCountMethod } from '@gltf-transform/functions';
import { logger } from '@gltf-transform/test-utils';

const { RENDER, RENDER_CACHED, GPU, GPU_NAIVE, UNUSED } = VertexCountMethod;

test('render', async (t) => {
	const document = new Document().setLogger(logger);
	t.is(getSceneVertexCount(createSceneBasic(document), RENDER), 32 * 4, 'basic');
	t.is(getSceneVertexCount(createSceneIndexed(document), RENDER), 32 + 9, 'indexed');
	t.is(getSceneVertexCount(createSceneInstanced(document), RENDER), 32 * 5, 'instanced');
	t.is(getSceneVertexCount(createSceneMixedAttributes(document), RENDER), 32 * 2, 'mixed attributes');
	t.is(getSceneVertexCount(createSceneUnused(document), RENDER), 15, 'unused');
});

test('render-cached', async (t) => {
	const document = new Document().setLogger(logger);
	t.is(getSceneVertexCount(createSceneBasic(document), RENDER_CACHED), 32 * 4, 'basic');
	t.is(getSceneVertexCount(createSceneIndexed(document), RENDER_CACHED), 32 + 5, 'indexed');
	t.is(getSceneVertexCount(createSceneInstanced(document), RENDER_CACHED), 32 * 5, 'instanced');
	t.is(getSceneVertexCount(createSceneMixedAttributes(document), RENDER_CACHED), 32 * 2, 'mixed attributes');
	t.is(getSceneVertexCount(createSceneUnused(document), RENDER_CACHED), 11, 'unused');
});

test('gpu-naive', async (t) => {
	const document = new Document().setLogger(logger);
	t.is(getSceneVertexCount(createSceneBasic(document), GPU_NAIVE), 32 * 4, 'basic');
	t.is(getSceneVertexCount(createSceneIndexed(document), GPU_NAIVE), 32 * 2, 'indexed');
	t.is(getSceneVertexCount(createSceneInstanced(document), GPU_NAIVE), 32, 'instanced');
	t.is(getSceneVertexCount(createSceneMixedAttributes(document), GPU_NAIVE), 32 * 2, 'mixed attributes');
	t.is(getSceneVertexCount(createSceneUnused(document), GPU_NAIVE), 32 * 2, 'unused');
});

test('gpu', async (t) => {
	const document = new Document().setLogger(logger);
	t.is(getSceneVertexCount(createSceneBasic(document), GPU), 32 * 4, 'basic');
	t.is(getSceneVertexCount(createSceneIndexed(document), GPU), 32, 'indexed');
	t.is(getSceneVertexCount(createSceneInstanced(document), GPU), 32, 'instanced');
	t.is(getSceneVertexCount(createSceneMixedAttributes(document), GPU), 32, 'mixed attributes');
	t.is(getSceneVertexCount(createSceneUnused(document), GPU), 32, 'unused');
});

test('unused', async (t) => {
	const document = new Document().setLogger(logger);
	t.is(getSceneVertexCount(createSceneBasic(document), UNUSED), 0, 'basic');
	t.is(getSceneVertexCount(createSceneIndexed(document), UNUSED), 0, 'indexed');
	t.is(getSceneVertexCount(createSceneInstanced(document), UNUSED), 0, 'instanced');
	t.is(getSceneVertexCount(createSceneMixedAttributes(document), UNUSED), 0, 'mixed attributes');
	t.is(getSceneVertexCount(createSceneUnused(document), UNUSED), 24, 'unused');
});

/**
 * Creates a scene with 4x meshes, each with 32 unindexed vertices.
 */
function createSceneBasic(document: Document): Scene {
	const scene = document.createScene('Basic');
	for (let i = 0; i < 4; i++) {
		const position = document.createAccessor().setType('VEC3').setArray(new Float32Array(96));
		const prim = document.createPrimitive().setAttribute('POSITION', position);
		const mesh = document.createMesh().addPrimitive(prim);
		const node = document.createNode().setMesh(mesh);
		scene.addChild(node);
	}
	return scene;
}

/**
 * Creates a scene with many 32 vertices in a vertex stream, partially indexed by each of
 * several mesh primitives.
 */
function createSceneIndexed(document: Document): Scene {
	const scene = document.createScene('Indexed');
	const position = document.createAccessor().setType('VEC3').setArray(new Float32Array(96));
	const mesh = document.createMesh();
	scene.addChild(document.createNode().setMesh(mesh));

	// [0, 1, 2] + [1, 2, 3] + [2, 3, 4]
	const indicesA = document.createAccessor().setArray(new Uint16Array([0, 1, 2, 1, 2, 3, 2, 3, 4]));
	const primA = document.createPrimitive().setAttribute('POSITION', position).setIndices(indicesA);
	mesh.addPrimitive(primA);

	// all vertices x 1
	const indicesB = document.createAccessor().setArray(new Uint16Array(32).map((_, i) => i));
	const primB = document.createPrimitive().setAttribute('POSITION', position).setIndices(indicesB);
	mesh.addPrimitive(primB);

	return scene;
}

/**
 * Creates a scene with one mesh primitive having 32 vertices, reused 2x with
 * typical instancing and 3x with GPU instancing.
 */
function createSceneInstanced(document: Document): Scene {
	const scene = document.createScene('Instanced');
	const position = document.createAccessor().setType('VEC3').setArray(new Float32Array(96));
	const prim = document.createPrimitive().setAttribute('POSITION', position);
	const mesh = document.createMesh().addPrimitive(prim);

	// instancing
	for (let i = 0; i < 2; i++) {
		scene.addChild(document.createNode().setMesh(mesh));
	}

	// gpu instancing
	const batchExtension = document.createExtension(EXTMeshGPUInstancing);
	const batchTranslation = document
		.createAccessor()
		.setType('VEC3')
		.setArray(new Float32Array([0, 0, 0, 10, 10, 10, 20, 20, 20]));
	const batch = batchExtension.createInstancedMesh().setAttribute('TRANSLATION', batchTranslation);
	scene.addChild(document.createNode().setMesh(mesh).setExtension('EXT_mesh_gpu_instancing', batch));

	return scene;
}

/**
 * Creates a scene with 32 vertices in a vertex stream, reused by two mesh primitives.
 * Some vertex attributes (other than position) differ between the two.
 */
function createSceneMixedAttributes(document: Document): Scene {
	const position = document.createAccessor().setType('VEC3').setArray(new Float32Array(96));
	const indices = document.createAccessor().setArray(new Uint16Array(32).map((_, i) => i));
	const colorA = document.createAccessor().setType('VEC3').setArray(new Float32Array(96));
	const colorB = document.createAccessor().setType('VEC3').setArray(new Float32Array(96));

	const primA = document
		.createPrimitive()
		.setIndices(indices)
		.setAttribute('POSITION', position)
		.setAttribute('COLOR_0', colorA);
	const primB = document
		.createPrimitive()
		.setIndices(indices)
		.setAttribute('POSITION', position)
		.setAttribute('COLOR_0', colorB);

	const mesh = document.createMesh().addPrimitive(primA).addPrimitive(primB);
	const node = document.createNode().setMesh(mesh);

	return document.createScene('MixedAttributes').addChild(node);
}

/**
 * Creates a scene with two mesh primitives and 32 vertices. Only 8 vertices
 * are indexed, leaving 24 vertices uploaded but not rendered.
 */
function createSceneUnused(document: Document): Scene {
	const scene = document.createScene('MixedAttributes');
	const position = document.createAccessor().setType('VEC3').setArray(new Float32Array(96));
	const indicesA = document.createAccessor().setArray(new Float32Array([5, 6, 7, 8, 9, 10]));
	const indicesB = document.createAccessor().setArray(new Float32Array([8, 9, 10, 11, 12, 8, 9, 10, 8]));
	const primA = document.createPrimitive().setIndices(indicesA).setAttribute('POSITION', position);
	const primB = document.createPrimitive().setIndices(indicesB).setAttribute('POSITION', position);
	const mesh = document.createMesh().addPrimitive(primA).addPrimitive(primB);
	const node = document.createNode().setMesh(mesh);
	return scene.addChild(node);
}
