import path, { dirname } from 'path';
import test from 'ava';
import { Document, NodeIO, getBounds, Format, Primitive } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { fileURLToPath } from 'url';

const INPUTS = ['BoxMeshopt.glb', 'BoxMeshopt.gltf'];

const __dirname = dirname(fileURLToPath(import.meta.url));

test('decoding', async (t) => {
	const io = await createEncoderIO();

	for (const input of INPUTS) {
		const doc = await io.read(path.join(__dirname, 'in', input));
		const bbox = getBounds(doc.getRoot().listScenes()[0]);
		t.deepEqual(
			bbox.min.map((v) => +v.toFixed(3)),
			[-0.5, -0.5, -0.5],
			`decompress (min) - "${input}"`,
		);
		t.deepEqual(
			bbox.max.map((v) => +v.toFixed(3)),
			[0.5, 0.5, 0.5],
			`decompress (max) - "${input}"`,
		);
	}
});

test('encoding', async (t) => {
	const io = await createEncoderIO();

	const doc = await io.read(path.join(__dirname, 'in', 'BoxMeshopt.glb'));
	const glb = await io.writeBinary(doc);
	const rtDoc = await io.readBinary(glb);

	const extensionsRequired = rtDoc
		.getRoot()
		.listExtensionsRequired()
		.map((ext) => ext.extensionName);
	const bbox = getBounds(doc.getRoot().listScenes()[0]);

	t.truthy(extensionsRequired.includes('EXT_meshopt_compression'), 'retains EXT_meshopt_compression');
	t.deepEqual(
		bbox.min.map((v) => +v.toFixed(3)),
		[-0.5, -0.5, -0.5],
		'round trip (min)',
	);
	t.deepEqual(
		bbox.max.map((v) => +v.toFixed(3)),
		[0.5, 0.5, 0.5],
		'round trip (max)',
	);
});

test('encoding sparse', async (t) => {
	const io = await createEncoderIO();

	const doc = new Document();
	doc.createExtension(EXTMeshoptCompression).setRequired(true);

	// prettier-ignore
	const positionArray = [
		0, 0, 1,
		0, 1, 0,
		0, 1, 1,
		0, 1, 0,
		0, 0, 1,
		0, 0, 0,
	];
	const sparseArray = [0, 0, 0, 0, 25, 0];

	const buffer = doc.createBuffer();
	const position = doc.createAccessor().setType('VEC3').setBuffer(buffer).setArray(new Float32Array(positionArray));
	const marker = doc.createAccessor().setBuffer(buffer).setArray(new Uint32Array(sparseArray)).setSparse(true);
	const prim = doc.createPrimitive().setAttribute('POSITION', position).setAttribute('_SPARSE', marker);
	const mesh = doc.createMesh().addPrimitive(prim);

	const { json, resources } = await io.writeJSON(doc, { format: Format.GLB });
	const primitiveDefs = json.meshes[0].primitives;
	const accessorDefs = json.accessors;

	t.is(primitiveDefs.length, mesh.listPrimitives().length, 'writes all primitives');
	t.deepEqual(
		primitiveDefs[0],
		{
			mode: Primitive.Mode.TRIANGLES,
			attributes: { POSITION: 0, _SPARSE: 1 },
		},
		'primitiveDef',
	);
	t.is(accessorDefs[0].count, 6, 'POSITION count');
	t.is(accessorDefs[1].count, 6, '_SPARSE count');
	t.is(accessorDefs[0].sparse, undefined, 'POSITION not sparse');
	t.is(accessorDefs[1].sparse.count, 1, '_SPARSE sparse');

	const rtDocument = await io.readJSON({ json, resources });
	const rtPosition = rtDocument.getRoot().listAccessors()[0];
	const rtMarker = rtDocument.getRoot().listAccessors()[1];

	t.is(rtPosition.getSparse(), false, 'POSITION not sparse (round trip)');
	t.is(rtMarker.getSparse(), true, '_SPARSE sparse (round trip)');
	t.deepEqual(Array.from(rtPosition.getArray()), positionArray, 'POSITION array');
	t.deepEqual(Array.from(rtMarker.getArray()), sparseArray, '_SPARSE array');
});

test('encoding grouped buffer views', async (t) => {
	const io = await createEncoderIO();

	const document = new Document();
	const buffer = document.createBuffer();
	const positionA = document.createAccessor().setType('VEC3').setArray(new Uint16Array(12)).setBuffer(buffer);
	const positionB = document.createAccessor().setType('VEC3').setArray(new Uint16Array(12)).setBuffer(buffer);
	const primA = document.createPrimitive().setAttribute('POSITION', positionA);
	const primB = document.createPrimitive().setAttribute('POSITION', positionB);
	const mesh = document.createMesh().addPrimitive(primA).addPrimitive(primB);
	const node = document.createNode().setMesh(mesh);
	const scene = document.createScene().addChild(node);
	document.getRoot().setDefaultScene(scene);
	document.createExtension(EXTMeshoptCompression).setRequired(true);

	const { json } = await io.writeJSON(document);

	t.deepEqual(
		json.meshes,
		[
			{
				primitives: [
					{ attributes: { POSITION: 0 }, mode: 4 },
					{ attributes: { POSITION: 1 }, mode: 4 },
				],
			},
		],
		'primitives',
	);

	t.deepEqual(
		json.buffers,
		[
			{
				uri: 'buffer.bin',
				byteLength: 88,
			},
			{
				byteLength: 64,
				extensions: {
					EXT_meshopt_compression: {
						fallback: true,
					},
				},
			},
		],
		'buffers',
	);

	t.deepEqual(
		json.bufferViews,
		[
			{
				buffer: 1,
				byteLength: 32,
				byteOffset: 0,
				byteStride: 8,
				extensions: {
					EXT_meshopt_compression: {
						buffer: 0,
						byteLength: 41,
						byteOffset: 0,
						byteStride: 8,
						count: 4,
						filter: undefined,
						mode: 'ATTRIBUTES',
					},
				},
				target: 34962,
			},
			{
				buffer: 1,
				byteLength: 32,
				byteOffset: 32,
				byteStride: 8,
				extensions: {
					EXT_meshopt_compression: {
						buffer: 0,
						byteLength: 41,
						byteOffset: 44,
						byteStride: 8,
						count: 4,
						filter: undefined,
						mode: 'ATTRIBUTES',
					},
				},
				target: 34962,
			},
		],
		'buffer views',
	);
});

async function createEncoderIO(): Promise<NodeIO> {
	await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
	return new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({
		'meshopt.decoder': MeshoptDecoder,
		'meshopt.encoder': MeshoptEncoder,
	});
}
