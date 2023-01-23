require('source-map-support').install();

import path from 'path';
import test from 'tape';
import { Document, NodeIO, getBounds, Format, Primitive } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '../';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

const INPUTS = ['BoxMeshopt.glb', 'BoxMeshopt.gltf'];

test('@gltf-transform/extensions::meshopt-compression | decoding', async (t) => {
	const io = await createEncoderIO();

	for (const input of INPUTS) {
		const doc = await io.read(path.join(__dirname, 'in', input));
		const bbox = getBounds(doc.getRoot().listScenes()[0]);
		t.deepEquals(
			bbox.min.map((v) => +v.toFixed(3)),
			[-0.5, -0.5, -0.5],
			`decompress (min) - "${input}"`
		);
		t.deepEquals(
			bbox.max.map((v) => +v.toFixed(3)),
			[0.5, 0.5, 0.5],
			`decompress (max) - "${input}"`
		);
	}

	t.end();
});

test('@gltf-transform/extensions::meshopt-compression | encoding', async (t) => {
	const io = await createEncoderIO();

	const doc = await io.read(path.join(__dirname, 'in', 'BoxMeshopt.glb'));
	const glb = await io.writeBinary(doc);
	const rtDoc = await io.readBinary(glb);

	const extensionsRequired = rtDoc
		.getRoot()
		.listExtensionsRequired()
		.map((ext) => ext.extensionName);
	const bbox = getBounds(doc.getRoot().listScenes()[0]);

	t.ok(extensionsRequired.includes('EXT_meshopt_compression'), 'retains EXT_meshopt_compression');
	t.deepEquals(
		bbox.min.map((v) => +v.toFixed(3)),
		[-0.5, -0.5, -0.5],
		'round trip (min)'
	);
	t.deepEquals(
		bbox.max.map((v) => +v.toFixed(3)),
		[0.5, 0.5, 0.5],
		'round trip (max)'
	);
	t.end();
});

test.only('@gltf-transform/extensions::meshopt-compression | encoding sparse', async (t) => {
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

	t.equals(primitiveDefs.length, mesh.listPrimitives().length, 'writes all primitives');
	t.deepEquals(
		primitiveDefs[0],
		{
			mode: Primitive.Mode.TRIANGLES,
			attributes: { POSITION: 0, _SPARSE: 1 },
		},
		'primitiveDef'
	);
	t.equals(accessorDefs[0].count, 6, 'POSITION count');
	t.equals(accessorDefs[1].count, 6, '_SPARSE count');
	t.equals(accessorDefs[0].sparse, undefined, 'POSITION not sparse');
	t.equals(accessorDefs[1].sparse.count, 1, '_SPARSE sparse');

	const rtDocument = await io.readJSON({ json, resources });
	const rtPosition = rtDocument.getRoot().listAccessors()[0];
	const rtMarker = rtDocument.getRoot().listAccessors()[1];

	t.equals(rtPosition.getSparse(), false, 'POSITION not sparse (round trip)');
	t.equals(rtMarker.getSparse(), true, '_SPARSE sparse (round trip)');
	t.deepEquals(Array.from(rtPosition.getArray()), positionArray, 'POSITION array');
	t.deepEquals(Array.from(rtMarker.getArray()), sparseArray, '_SPARSE array');

	t.end();
});

async function createEncoderIO(): Promise<NodeIO> {
	await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
	return new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({
		'meshopt.decoder': MeshoptDecoder,
		'meshopt.encoder': MeshoptEncoder,
	});
}
