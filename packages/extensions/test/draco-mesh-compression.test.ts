require('source-map-support').install();

import path from 'path';
import { createDecoderModule, createEncoderModule } from 'draco3dgltf';
import test from 'tape';
import { Accessor, Buffer, Document, Format, NodeIO, Primitive } from '@gltf-transform/core';
import { bounds } from '@gltf-transform/functions';
import { DracoMeshCompression } from '../';

test('@gltf-transform/extensions::draco-mesh-compression | decoding', async (t) => {
	const io = await createDecoderIO();
	const doc = io.read(path.join(__dirname, 'in', 'BoxDraco.gltf'));
	const bbox = bounds(doc.getRoot().listScenes()[0]);
	t.deepEquals(
		bbox.min.map((v) => +v.toFixed(3)),
		[-0.5, -0.5, -0.5],
		'decompress (min)'
	);
	t.deepEquals(
		bbox.max.map((v) => +v.toFixed(3)),
		[0.5, 0.5, 0.5],
		'decompress (max)'
	);
	t.end();
});

test('@gltf-transform/extensions::draco-mesh-compression | encoding complete', async (t) => {
	// Cases:
	// (1) Entire primitive reused (share compressed buffer views).
	// (2) All primitive accessors reused (share compressed buffer views).

	const doc = new Document();
	doc.createExtension(DracoMeshCompression).setRequired(true);

	const buffer = doc.createBuffer();
	const prim1 = createMeshPrimitive(doc, buffer);
	const prim2 = createMeshPrimitive(doc, buffer);

	const mesh = doc
		.createMesh()
		.addPrimitive(prim1)
		.addPrimitive(prim1) // x2
		.addPrimitive(prim2)
		.addPrimitive(prim2.clone());
	doc.createNode().setMesh(mesh);

	let io = await createEncoderIO();
	const jsonDoc = io.writeJSON(doc, { format: Format.GLB });
	const primitiveDefs = jsonDoc.json.meshes[0].primitives;

	t.equals(primitiveDefs.length, mesh.listPrimitives().length, 'writes all primitives');
	t.deepEquals(
		primitiveDefs[0],
		{
			mode: Primitive.Mode.TRIANGLES,
			indices: 0,
			attributes: { POSITION: 1 },
			extensions: {
				KHR_draco_mesh_compression: {
					bufferView: 0,
					attributes: { POSITION: 0 },
				},
			},
		},
		'primitiveDef 1/4'
	);
	t.deepEquals(
		primitiveDefs[1],
		{
			mode: Primitive.Mode.TRIANGLES,
			indices: 0,
			attributes: { POSITION: 1 },
			extensions: {
				KHR_draco_mesh_compression: {
					bufferView: 0,
					attributes: { POSITION: 0 },
				},
			},
		},
		'primitiveDef 2/4'
	);
	t.deepEquals(
		primitiveDefs[2],
		{
			mode: Primitive.Mode.TRIANGLES,
			indices: 2,
			attributes: { POSITION: 3 },
			extensions: {
				KHR_draco_mesh_compression: {
					bufferView: 1,
					attributes: { POSITION: 0 },
				},
			},
		},
		'primitiveDef 3/4'
	);
	t.deepEquals(
		primitiveDefs[3],
		{
			mode: Primitive.Mode.TRIANGLES,
			indices: 2, // shared.
			attributes: { POSITION: 3 }, // shared.
			extensions: {
				KHR_draco_mesh_compression: {
					bufferView: 1, // shared.
					attributes: { POSITION: 0 },
				},
			},
		},
		'primitiveDef 4/4'
	);
	t.deepEquals(jsonDoc.json.extensionsUsed, ['KHR_draco_mesh_compression'], 'included in extensionsUsed');

	io = await createDecoderIO();
	const roundtripDoc = io.readJSON(jsonDoc);
	const roundtripNode = roundtripDoc.getRoot().listNodes()[0];
	const bbox = bounds(roundtripNode);
	t.deepEquals(
		bbox.min.map((v) => +v.toFixed(3)),
		[0, -1, -1],
		'round trip (min)'
	);
	t.deepEquals(
		bbox.max.map((v) => +v.toFixed(3)),
		[1, 1, 1],
		'round trip (max)'
	);
	t.end();
});

test('@gltf-transform/extensions::draco-mesh-compression | encoding skipped', async (t) => {
	// Cases:
	// (1) Non-indexed.
	// (2) Non-TRIANGLES.

	const doc = new Document();
	doc.createExtension(DracoMeshCompression).setRequired(true);

	const buffer = doc.createBuffer();
	const prim1 = createMeshPrimitive(doc, buffer);
	const prim2 = createMeshPrimitive(doc, buffer);

	prim1.getIndices().dispose();
	prim2.setMode(Primitive.Mode.TRIANGLE_FAN);

	const mesh = doc.createMesh().addPrimitive(prim1).addPrimitive(prim2);

	const io = await createEncoderIO();
	const jsonDoc = io.writeJSON(doc, { format: Format.GLB });
	const primitiveDefs = jsonDoc.json.meshes[0].primitives;

	t.equals(primitiveDefs.length, mesh.listPrimitives().length, 'writes all primitives');
	t.deepEquals(
		primitiveDefs[0],
		{
			mode: Primitive.Mode.TRIANGLES,
			attributes: { POSITION: 0 },
		},
		'primitiveDef 1/2'
	);
	t.deepEquals(
		primitiveDefs[1],
		{
			mode: Primitive.Mode.TRIANGLE_FAN,
			indices: 2,
			attributes: { POSITION: 1 },
		},
		'primitiveDef 2/2'
	);
	t.notOk(jsonDoc.json.extensionsUsed, 'omitted from extensionsUsed');
	t.end();
});

test('@gltf-transform/extensions::draco-mesh-compression | mixed indices', async (t) => {
	const doc = new Document();
	doc.createExtension(DracoMeshCompression).setRequired(true);

	const buffer = doc.createBuffer();
	const prim1 = createMeshPrimitive(doc, buffer);
	const prim2 = prim1.clone();

	prim2.setIndices(
		doc
			.createAccessor()
			.setArray(new Uint32Array([0, 1, 2, 3, 4, 5]))
			.setBuffer(buffer)
	);

	doc.createMesh().addPrimitive(prim1).addPrimitive(prim2);

	const io = await createEncoderIO();
	const jsonDoc = io.writeJSON(doc, { format: Format.GLB });
	const primitiveDefs = jsonDoc.json.meshes[0].primitives;

	// The two primitives have different indices, and must be encoded as entirely separate buffer
	// views. The shared attribute accessor is cloned.
	t.deepEquals(
		primitiveDefs[0],
		{
			mode: Primitive.Mode.TRIANGLES,
			indices: 0,
			attributes: { POSITION: 1 },
			extensions: {
				KHR_draco_mesh_compression: {
					bufferView: 0,
					attributes: { POSITION: 0 },
				},
			},
		},
		'primitiveDef 1/2'
	);
	t.deepEquals(
		primitiveDefs[1],
		{
			mode: Primitive.Mode.TRIANGLES,
			indices: 2,
			attributes: { POSITION: 3 },
			extensions: {
				KHR_draco_mesh_compression: {
					bufferView: 1,
					attributes: { POSITION: 0 },
				},
			},
		},
		'primitiveDef 2/2'
	);
	t.end();
});

test.only('@gltf-transform/extensions::draco-mesh-compression | mixed attributes', async (t) => {
	const doc = new Document();
	doc.createExtension(DracoMeshCompression).setRequired(true);

	const buffer = doc.createBuffer();
	const prim1 = createMeshPrimitive(doc, buffer);
	const prim2 = prim1.clone();

	prim2.setAttribute(
		'COLOR_0',
		doc
			.createAccessor()
			.setType(Accessor.Type.VEC3)
			.setArray(
				new Float32Array([
					0, 0, 0, 0.15, 0.15, 0.15, 0.3, 0.3, 0.3, 0.45, 0.45, 0.45, 0.6, 0.6, 0.6, 0.75, 0.75, 0.75,
				])
			)
			.setBuffer(buffer)
	);

	doc.createMesh().addPrimitive(prim1).addPrimitive(prim2);

	const io = await createEncoderIO();
	const jsonDoc = io.writeJSON(doc, { format: Format.GLB });
	const primitiveDefs = jsonDoc.json.meshes[0].primitives;

	// The two primitives have different attributes, and must be encoded as entirely separate
	// buffer views. The shared indices accessor is cloned.
	t.deepEquals(
		primitiveDefs[0],
		{
			mode: Primitive.Mode.TRIANGLES,
			indices: 0,
			attributes: { POSITION: 1 },
			extensions: {
				KHR_draco_mesh_compression: {
					bufferView: 0,
					attributes: { POSITION: 0 },
				},
			},
		},
		'primitiveDef 1/2'
	);
	t.deepEquals(
		primitiveDefs[1],
		{
			mode: Primitive.Mode.TRIANGLES,
			indices: 2,
			attributes: { POSITION: 3, COLOR_0: 4 },
			extensions: {
				KHR_draco_mesh_compression: {
					bufferView: 1,
					attributes: { POSITION: 0, COLOR_0: 1 },
				},
			},
		},
		'primitiveDef 2/2'
	);
	t.end();
});

test('@gltf-transform/extensions::draco-mesh-compression | non-primitive parent', async (t) => {
	const doc = new Document();
	doc.createExtension(DracoMeshCompression).setRequired(true);

	const prim = createMeshPrimitive(doc, doc.createBuffer());
	prim.addTarget(doc.createPrimitiveTarget().setAttribute('POSITION', prim.getAttribute('POSITION')));
	doc.createMesh().addPrimitive(prim);

	const io = await createEncoderIO();
	t.throws(() => io.writeJSON(doc, { format: Format.GLB }), 'invalid accessor reuse');
	t.end();
});

function createMeshPrimitive(doc: Document, buffer: Buffer): Primitive {
	// TODO(cleanup): Draco writes this as 9 indices, 9 vertices. Why?
	const indices = doc
		.createAccessor()
		.setArray(new Uint32Array([0, 1, 2, 5, 4, 3, 2, 1, 0]))
		.setBuffer(buffer);
	const position = doc
		.createAccessor()
		.setType(Accessor.Type.VEC3)
		.setArray(new Float32Array([0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 1, 0, 0, -1, 0, 1, 0, 0]))
		.setBuffer(buffer);
	return doc.createPrimitive().setIndices(indices).setAttribute('POSITION', position);
}

// Helper functions to create I/O instaces initialized with Draco dependencies.
// Create separate instances for encoding and decoding, to help test that
// they work independently.

let decoderIO: Promise<NodeIO>;
let encoderIO: Promise<NodeIO>;

async function createDecoderIO(): Promise<NodeIO> {
	if (decoderIO) return decoderIO;

	decoderIO = createDecoderModule().then((decoder) => {
		return new NodeIO()
			.registerExtensions([DracoMeshCompression])
			.registerDependencies({ 'draco3d.decoder': decoder });
	});

	return decoderIO;
}

async function createEncoderIO(): Promise<NodeIO> {
	if (encoderIO) return encoderIO;

	encoderIO = createEncoderModule().then((encoder) => {
		return new NodeIO()
			.registerExtensions([DracoMeshCompression])
			.registerDependencies({ 'draco3d.encoder': encoder });
	});

	return encoderIO;
}
