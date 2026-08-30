import { deepEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, getBounds, NodeIO, Primitive } from '@gltf-transform/core';
import { KHRDracoMeshCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import {
	getGLPrimitiveCount,
	getSceneVertexCount,
	simplify,
	simplifyPrimitive,
	unweld,
	VertexCountMethod,
	weld,
} from '@gltf-transform/functions';
import {
	createLineLoopPrim,
	createTorusKnotPrimitive,
	createTriangleFanPrim,
	createTriangleStripPrim,
	logger,
	roundBbox,
} from '@gltf-transform/test-utils';
import draco3d from 'draco3dgltf';
import { MeshoptSimplifier } from 'meshoptimizer';
import path, { dirname } from 'path';
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

describe('functions::simplify', () => {
	test('welded', async () => {
		const io = await createIO();
		const document = await io.read(path.join(__dirname, 'in', 'DenseSphere.glb'));
		const scene = document.getRoot().getDefaultScene()!;

		const srcCount = getSceneVertexCount(scene, VertexCountMethod.UPLOAD_NAIVE);
		const srcBounds = roundBbox(getBounds(scene), 2);

		await document.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0.5, error: 0.001 }));

		const dstCount = getSceneVertexCount(scene, VertexCountMethod.UPLOAD_NAIVE);
		const dstBounds = roundBbox(getBounds(scene), 2);

		ok((srcCount - dstCount) / srcCount > 0.45, '>=45% reduction');
		ok(srcCount > dstCount, 'src.count > dst.count');
		deepEqual(srcBounds, dstBounds, 'src.bounds = dst.bounds');
	});

	test('unwelded', async () => {
		const io = await createIO();
		const document = await io.read(path.join(__dirname, 'in', 'DenseSphere.glb'));
		const scene = document.getRoot().getDefaultScene()!;

		const srcCount = getSceneVertexCount(scene, VertexCountMethod.UPLOAD_NAIVE);
		const srcBounds = roundBbox(getBounds(scene), 2);

		await document.transform(unweld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0.5, error: 0.001 }));

		const dstCount = getSceneVertexCount(scene, VertexCountMethod.UPLOAD_NAIVE);
		const dstBounds = roundBbox(getBounds(scene), 2);

		ok((srcCount - dstCount) / srcCount > 0.45, '>=45% reduction');
		ok(srcCount > dstCount, 'src.count > dst.count');
		deepEqual(srcBounds, dstBounds, 'src.bounds = dst.bounds');
	});

	test('shared accessors', async () => {
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

		ok((srcCount - dstCount) / srcCount > 0.5, '>=50% reduction');
		ok(srcCount > dstCount, 'src.count > dst.count');
		deepEqual(srcBounds, dstBounds, 'src.bounds = dst.bounds');
	});

	test('degenerate', async () => {
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

		ok(prim.isDisposed(), 'prim disposed');
		ok(mesh.isDisposed(), 'mesh disposed');
		strictEqual(node.isDisposed(), false, 'node kept');
		strictEqual(scene.isDisposed(), false, 'scene kept');
		strictEqual(getSceneVertexCount(scene, VertexCountMethod.UPLOAD_NAIVE), 0, '0 vertices');
	});

	test('torus', async () => {
		const document = new Document().setLogger(logger);
		const prim = createTorusKnotPrimitive(document);
		const srcIndices = prim.getIndices()!;
		document.createMesh().addPrimitive(prim);

		ok(srcIndices.getCount() / 3 > 1000, '>1000 triangles (before)');

		await document.transform(simplify({ simplifier: MeshoptSimplifier, ratio: 0.5, error: 0.01 }));

		const dstIndices = prim.getIndices()!;
		ok(dstIndices.getCount() / 3 < 750, '<750 triangles (after)');
	});

	test('torus submesh', async () => {
		const document = new Document().setLogger(logger);
		const prim = createTorusKnotPrimitive(document);
		const srcIndices = prim.getIndices()!;
		srcIndices.setArray(srcIndices.getArray().slice(0, 90));
		document.createMesh().addPrimitive(prim);

		ok(srcIndices.getCount() / 3 === 30, '30 triangles (before)');

		await document.transform(simplify({ simplifier: MeshoptSimplifier, ratio: 0.25, error: 0.05 }));

		const dstIndices = prim.getIndices()!;
		ok(dstIndices.getCount() / 3 < 20, '<20 triangles (after)');
	});

	test('points - unwelded', async () => {
		const document = new Document().setLogger(logger);
		const prim = createTorusKnotPrimitive(document, { tubularSegments: 12, radialSegments: 4 })
			.setMode(POINTS)
			.setIndices(null);
		document.createMesh().addPrimitive(prim);

		strictEqual(prim.getAttribute('POSITION').getCount(), 65, '65 vertices (before)');

		await document.transform(simplify({ simplifier: MeshoptSimplifier, ratio: 0.5 }));

		ok(prim.getAttribute('POSITION').getCount() < 40, '<40 vertices (after)');
	});

	test('points - welded', async () => {
		const document = new Document().setLogger(logger);
		const prim = createTorusKnotPrimitive(document, { tubularSegments: 12, radialSegments: 4 }).setMode(POINTS);
		prim.getIndices().setArray(new Uint16Array(65).map((_, i) => i));
		document.createMesh().addPrimitive(prim);

		strictEqual(prim.getAttribute('POSITION').getCount(), 65, '65 vertices (before)');
		ok(prim.getIndices(), 'welded (before)');

		await document.transform(simplify({ simplifier: MeshoptSimplifier, ratio: 0.5 }));

		ok(prim.getAttribute('POSITION').getCount() < 40, '<40 vertices (after)');
		strictEqual(prim.getIndices(), null, 'unwelded (after)');
	});

	test('lines', async () => {
		const document = new Document().setLogger(logger);
		const primBase = createLineLoopPrim(document).setMode(LINES);
		const primLines = createLineLoopPrim(document).setMode(LINES);
		const primLineStrip = createLineLoopPrim(document).setMode(LINE_STRIP);
		const primLineLoop = createLineLoopPrim(document).setMode(LINE_LOOP);

		await MeshoptSimplifier.ready;
		simplifyPrimitive(primLines, { simplifier: MeshoptSimplifier, ratio: 0.5, error: 0.25 });
		simplifyPrimitive(primLineStrip, { simplifier: MeshoptSimplifier, ratio: 0.5, error: 0.25 });

		strictEqual(primBase.equals(primLines), true, 'LINES unchanged');
		strictEqual(primBase.equals(primLineStrip, new Set(['mode'])), true, 'LINE_STRIP unchanged');
		strictEqual(primBase.equals(primLineLoop, new Set(['mode'])), true, 'LINE_LOOP unchanged');
	});

	test('triangle-strip and triangle-mode', async () => {
		const document = new Document().setLogger(logger);
		const primTriangleStripBase = createTriangleStripPrim(document, 32);
		const primTriangleStrip = createTriangleStripPrim(document, 32);
		const primTriangleFanBase = createTriangleFanPrim(document, 32);
		const primTriangleFan = createTriangleFanPrim(document, 32);

		await MeshoptSimplifier.ready;
		simplifyPrimitive(primTriangleStrip, { simplifier: MeshoptSimplifier, ratio: 0.5, error: 0.25 });
		simplifyPrimitive(primTriangleFan, { simplifier: MeshoptSimplifier, ratio: 0.5, error: 0.25 });

		strictEqual(primTriangleStrip.getMode(), TRIANGLES, 'triangle-strip → triangles');
		strictEqual(primTriangleFan.getMode(), TRIANGLES, 'triangle-fan → triangles');

		const triangleStripRatio = getGLPrimitiveCount(primTriangleStrip) / getGLPrimitiveCount(primTriangleStripBase);
		const triangleFanRatio = getGLPrimitiveCount(primTriangleFan) / getGLPrimitiveCount(primTriangleFanBase);

		ok(Math.abs(triangleStripRatio - 0.5) < 0.01, 'triangle strip reduced ~ 50%');
		ok(Math.abs(triangleFanRatio - 0.5) < 0.01, 'triangle fan reduced ~ 50%');
	});

	test('no side effects', async () => {
		const document = new Document().setLogger(logger);
		const attributeA = document.createAccessor().setType('VEC3').setArray(new Float32Array(9));
		attributeA.clone();

		await document.transform(simplify({ simplifier: MeshoptSimplifier }));

		strictEqual(document.getRoot().listAccessors().length, 2, 'skips unused accessors');
	});
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
