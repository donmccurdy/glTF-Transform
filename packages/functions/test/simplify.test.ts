import test from 'ava';
import path, { dirname } from 'path';
import { getBounds, Document, NodeIO, Primitive } from '@gltf-transform/core';
import { KHRDracoMeshCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import {
	weld,
	unweld,
	simplify,
	getSceneVertexCount,
	VertexCountMethod,
	simplifyPrimitive,
	getGLPrimitiveCount,
} from '@gltf-transform/functions';
import {
	logger,
	roundBbox,
	createTorusKnotPrimitive,
	createLineLoopPrim,
	createTriangleFanPrim,
	createTriangleStripPrim,
} from '@gltf-transform/test-utils';
import { MeshoptSimplifier } from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const { POINTS, LINES, LINE_STRIP, LINE_LOOP, TRIANGLES } = Primitive.Mode;

async function createIO(): Promise<NodeIO> {
	const io = new NodeIO()
		.setLogger(logger)
		.registerExtensions([KHRDracoMeshCompression, KHRMeshQuantization])
		.registerDependencies({
			'draco3d.decoder': await draco3d.createDecoderModule(),
		});
	await MeshoptSimplifier.ready;
	return io;
}

test('welded', async (t) => {
	const io = await createIO();
	const document = await io.read(path.join(__dirname, 'in', 'DenseSphere.glb'));
	const scene = document.getRoot().getDefaultScene()!;

	const srcCount = getSceneVertexCount(scene, VertexCountMethod.UPLOAD_NAIVE);
	const srcBounds = roundBbox(getBounds(scene), 2);

	await document.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0.5, error: 0.001 }));

	const dstCount = getSceneVertexCount(scene, VertexCountMethod.UPLOAD_NAIVE);
	const dstBounds = roundBbox(getBounds(scene), 2);

	t.truthy((srcCount - dstCount) / srcCount > 0.45, '>=45% reduction');
	t.truthy(srcCount > dstCount, 'src.count > dst.count');
	t.deepEqual(srcBounds, dstBounds, 'src.bounds = dst.bounds');
});

test('unwelded', async (t) => {
	const io = await createIO();
	const document = await io.read(path.join(__dirname, 'in', 'DenseSphere.glb'));
	const scene = document.getRoot().getDefaultScene()!;

	const srcCount = getSceneVertexCount(scene, VertexCountMethod.UPLOAD_NAIVE);
	const srcBounds = roundBbox(getBounds(scene), 2);

	await document.transform(unweld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0.5, error: 0.001 }));

	const dstCount = getSceneVertexCount(scene, VertexCountMethod.UPLOAD_NAIVE);
	const dstBounds = roundBbox(getBounds(scene), 2);

	t.truthy((srcCount - dstCount) / srcCount > 0.45, '>=45% reduction');
	t.truthy(srcCount > dstCount, 'src.count > dst.count');
	t.deepEqual(srcBounds, dstBounds, 'src.bounds = dst.bounds');
});

test('shared accessors', async (t) => {
	const io = await createIO();
	const document = await io.read(path.join(__dirname, 'in', 'DenseSphere.glb'));

	// Remove existing nodes.
	const scene = document.getRoot().getDefaultScene()!;
	const root = document.getRoot();
	root.listNodes().forEach((node) => node.dispose());

	// Create two meshes sharing a vertex stream with different indices.
	const meshA = document.getRoot().listMeshes()[0];
	const primA = meshA.listPrimitives()[0];
	const primB = primA.clone();
	splitPrim(primA, 0, 0.5);
	splitPrim(primB, 0.5, 1);
	const meshB = document.createMesh().addPrimitive(primB);

	// Place both meshes in scene.
	const nodeA = document.createNode('A').setTranslation([5, 0, 0]).setMesh(meshA);
	const nodeB = document.createNode('B').setTranslation([-5, 0, 0]).setMesh(meshB);
	scene.addChild(nodeA).addChild(nodeB);

	const srcCount = getSceneVertexCount(scene, VertexCountMethod.UPLOAD_NAIVE);
	const srcBounds = roundBbox(getBounds(scene), 2);

	await document.transform(unweld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0.5 }));

	const dstCount = getSceneVertexCount(scene, VertexCountMethod.UPLOAD_NAIVE);
	const dstBounds = roundBbox(getBounds(scene), 2);

	t.truthy((srcCount - dstCount) / srcCount > 0.5, '>=50% reduction');
	t.truthy(srcCount > dstCount, 'src.count > dst.count');
	t.deepEqual(srcBounds, dstBounds, 'src.bounds = dst.bounds');
});

test('degenerate', async (t) => {
	const document = new Document().setLogger(logger);
	const position = document
		.createAccessor()
		.setArray(new Float32Array([0, 0, 0, 0, 0.01, 0, 0, 0, 1]))
		.setType('VEC3');
	const prim = document.createPrimitive().setAttribute('POSITION', position);
	const mesh = document.createMesh().addPrimitive(prim);
	const node = document.createNode().setMesh(mesh);
	const scene = document.createScene().addChild(node);

	await document.transform(simplify({ simplifier: MeshoptSimplifier, ratio: 0.01, error: 0.1 }));

	t.true(prim.isDisposed(), 'prim disposed');
	t.true(mesh.isDisposed(), 'mesh disposed');
	t.true(node.isDisposed(), 'node disposed');
	t.false(scene.isDisposed(), 'scene kept');
	t.is(getSceneVertexCount(scene, VertexCountMethod.UPLOAD_NAIVE), 0, '0 vertices');
});

test('torus', async (t) => {
	const document = new Document().setLogger(logger);
	const prim = createTorusKnotPrimitive(document);
	const srcIndices = prim.getIndices()!;
	document.createMesh().addPrimitive(prim);

	t.true(srcIndices.getCount() / 3 > 1000, '>1000 triangles (before)');

	await document.transform(simplify({ simplifier: MeshoptSimplifier, ratio: 0.5, error: 0.01 }));

	const dstIndices = prim.getIndices()!;
	t.true(dstIndices.getCount() / 3 < 750, '<750 triangles (after)');
});

test('torus submesh', async (t) => {
	const document = new Document().setLogger(logger);
	const prim = createTorusKnotPrimitive(document);
	const srcIndices = prim.getIndices()!;
	srcIndices.setArray(srcIndices.getArray().slice(0, 90));
	document.createMesh().addPrimitive(prim);

	t.true(srcIndices.getCount() / 3 === 30, '30 triangles (before)');

	await document.transform(simplify({ simplifier: MeshoptSimplifier, ratio: 0.25, error: 0.05 }));

	const dstIndices = prim.getIndices()!;
	t.true(dstIndices.getCount() / 3 < 20, '<20 triangles (after)');
});

test('points - unwelded', async (t) => {
	const document = new Document().setLogger(logger);
	const prim = createTorusKnotPrimitive(document, { tubularSegments: 12, radialSegments: 4 })
		.setMode(POINTS)
		.setIndices(null);
	document.createMesh().addPrimitive(prim);

	t.is(prim.getAttribute('POSITION').getCount(), 65, '65 vertices (before)');

	await document.transform(simplify({ simplifier: MeshoptSimplifier, ratio: 0.5 }));

	t.true(prim.getAttribute('POSITION').getCount() < 40, '<40 vertices (after)');
});

test('points - welded', async (t) => {
	const document = new Document().setLogger(logger);
	const prim = createTorusKnotPrimitive(document, { tubularSegments: 12, radialSegments: 4 }).setMode(POINTS);
	prim.getIndices().setArray(new Uint16Array(65).map((_, i) => i));
	document.createMesh().addPrimitive(prim);

	t.is(prim.getAttribute('POSITION').getCount(), 65, '65 vertices (before)');
	t.truthy(prim.getIndices(), 'welded (before)');

	await document.transform(simplify({ simplifier: MeshoptSimplifier, ratio: 0.5 }));

	t.true(prim.getAttribute('POSITION').getCount() < 40, '<40 vertices (after)');
	t.is(prim.getIndices(), null, 'unwelded (after)');
});

test('lines', async (t) => {
	const document = new Document().setLogger(logger);
	const primBase = createLineLoopPrim(document).setMode(LINES);
	const primLines = createLineLoopPrim(document).setMode(LINES);
	const primLineStrip = createLineLoopPrim(document).setMode(LINE_STRIP);
	const primLineLoop = createLineLoopPrim(document).setMode(LINE_LOOP);

	await MeshoptSimplifier.ready;
	simplifyPrimitive(primLines, { simplifier: MeshoptSimplifier, ratio: 0.5, error: 0.25 });
	simplifyPrimitive(primLineStrip, { simplifier: MeshoptSimplifier, ratio: 0.5, error: 0.25 });

	t.is(primBase.equals(primLines), true, 'LINES unchanged');
	t.is(primBase.equals(primLineStrip, new Set(['mode'])), true, 'LINE_STRIP unchanged');
	t.is(primBase.equals(primLineLoop, new Set(['mode'])), true, 'LINE_LOOP unchanged');
});

test('triangle-strip and triangle-mode', async (t) => {
	const document = new Document().setLogger(logger);
	const primTriangleStripBase = createTriangleStripPrim(document, 32);
	const primTriangleStrip = createTriangleStripPrim(document, 32);
	const primTriangleFanBase = createTriangleFanPrim(document, 32);
	const primTriangleFan = createTriangleFanPrim(document, 32);

	await MeshoptSimplifier.ready;
	simplifyPrimitive(primTriangleStrip, { simplifier: MeshoptSimplifier, ratio: 0.5, error: 0.25 });
	simplifyPrimitive(primTriangleFan, { simplifier: MeshoptSimplifier, ratio: 0.5, error: 0.25 });

	t.is(primTriangleStrip.getMode(), TRIANGLES, 'triangle-strip → triangles');
	t.is(primTriangleFan.getMode(), TRIANGLES, 'triangle-fan → triangles');

	const triangleStripRatio = getGLPrimitiveCount(primTriangleStrip) / getGLPrimitiveCount(primTriangleStripBase);
	const triangleFanRatio = getGLPrimitiveCount(primTriangleFan) / getGLPrimitiveCount(primTriangleFanBase);

	t.true(Math.abs(triangleStripRatio - 0.5) < 0.01, 'triangle strip reduced ~ 50%');
	t.true(Math.abs(triangleFanRatio - 0.5) < 0.01, 'triangle fan reduced ~ 50%');
});

test('no side effects', async (t) => {
	const document = new Document().setLogger(logger);
	const attributeA = document.createAccessor().setType('VEC3').setArray(new Float32Array(9));
	attributeA.clone();

	await document.transform(simplify({ cleanup: false, simplifier: MeshoptSimplifier }));

	t.is(document.getRoot().listAccessors().length, 2, 'skips prune and dedup');
});

/* UTILITIES */

function splitPrim(prim: Primitive, start: number, end: number) {
	const indices = prim.getIndices()!.clone();
	const indicesArray = indices.getArray()!;
	indices.setArray(
		indicesArray.slice(
			Math.floor((start * indices.getCount()) / 3) * 3,
			Math.ceil((end * indices.getCount()) / 3) * 3,
		),
	);
	prim.setIndices(indices);
}
