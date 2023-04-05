import test from 'ava';
import path, { dirname } from 'path';
import { bbox, getBounds, Document, Logger, NodeIO, Primitive, vec3 } from '@gltf-transform/core';
import { KHRDracoMeshCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { weld, unweld, simplify } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function createIO(): Promise<NodeIO> {
	const io = new NodeIO()
		.setLogger(new Logger(Logger.Verbosity.SILENT))
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

	const srcCount = getVertexCount(document);
	const srcBounds = roundBbox(getBounds(scene), 2);

	await document.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0.5, error: 0.001 }));

	const dstCount = getVertexCount(document);
	const dstBounds = roundBbox(getBounds(scene), 2);

	t.truthy((srcCount - dstCount) / srcCount > 0.5, '≥50% reduction');
	t.truthy(srcCount > dstCount, 'src.count > dst.count');
	t.deepEqual(srcBounds, dstBounds, 'src.bounds = dst.bounds');
});

test('unwelded', async (t) => {
	const io = await createIO();
	const document = await io.read(path.join(__dirname, 'in', 'DenseSphere.glb'));
	const scene = document.getRoot().getDefaultScene()!;

	const srcCount = getVertexCount(document);
	const srcBounds = roundBbox(getBounds(scene), 2);

	await document.transform(unweld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0.5, error: 0.001 }));

	const dstCount = getVertexCount(document);
	const dstBounds = roundBbox(getBounds(scene), 2);

	t.truthy((srcCount - dstCount) / srcCount > 0.5, '≥50% reduction');
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

	const srcCount = getVertexCount(document);
	const srcBounds = roundBbox(getBounds(scene), 2);

	await document.transform(unweld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0.5 }));

	const dstCount = getVertexCount(document);
	const dstBounds = roundBbox(getBounds(scene), 2);

	t.truthy((srcCount - dstCount) / srcCount > 0.5, '≥50% reduction');
	t.truthy(srcCount > dstCount, 'src.count > dst.count');
	t.deepEqual(srcBounds, dstBounds, 'src.bounds = dst.bounds');
});

/* UTILITIES */

/** Creates a rounding function for given decimal precision. */
function round(decimals: number): (v: number) => number {
	const f = Math.pow(10, decimals);
	return (v: number) => Math.round(v * f) / f;
}

function roundBbox(bbox: bbox, decimals: number): bbox {
	return {
		min: bbox.min.map(round(decimals)) as vec3,
		max: bbox.max.map(round(decimals)) as vec3,
	};
}

function getVertexCount(document: Document): number {
	let count = 0;
	for (const mesh of document.getRoot().listMeshes()) {
		for (const prim of mesh.listPrimitives()) {
			count += prim.getAttribute('POSITION')!.getCount();
		}
	}
	return count;
}

function splitPrim(prim: Primitive, start: number, end: number) {
	const indices = prim.getIndices()!.clone();
	const indicesArray = indices.getArray()!;
	indices.setArray(
		indicesArray.slice(
			Math.floor((start * indices.getCount()) / 3) * 3,
			Math.ceil((end * indices.getCount()) / 3) * 3
		)
	);
	prim.setIndices(indices);
}
