import path, { dirname } from 'path';
import { createDecoderModule, createEncoderModule } from 'draco3dgltf';
import test from 'ava';
import { Accessor, Buffer, Document, Format, NodeIO, Primitive, getBounds } from '@gltf-transform/core';
import { KHRDracoMeshCompression } from '@gltf-transform/extensions';
import { logger } from '@gltf-transform/test-utils';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('decoding', async (t) => {
	const io = await createDecoderIO();
	const document = await io.read(path.join(__dirname, 'in', 'BoxDraco.gltf'));
	const bbox = getBounds(document.getRoot().listScenes()[0]);
	t.deepEqual(
		bbox.min.map((v) => +v.toFixed(3)),
		[-0.5, -0.5, -0.5],
		'decompress (min)',
	);
	t.deepEqual(
		bbox.max.map((v) => +v.toFixed(3)),
		[0.5, 0.5, 0.5],
		'decompress (max)',
	);
});

test('encoding complete', async (t) => {
	// Cases:
	// (1) Entire primitive reused (share compressed buffer views).
	// (2) All primitive accessors reused (share compressed buffer views).

	const document = new Document().setLogger(logger);
	document.createExtension(KHRDracoMeshCompression).setRequired(true);

	const buffer = document.createBuffer();
	const prim1 = createMeshPrimitive(document, buffer);
	const prim2 = createMeshPrimitive(document, buffer);

	const mesh = document.createMesh().addPrimitive(prim1).addPrimitive(prim2).addPrimitive(prim2.clone());
	document.createNode().setMesh(mesh);

	let io = await createEncoderIO();
	const jsonDoc = await io.writeJSON(document, { format: Format.GLB });
	const primitiveDefs = jsonDoc.json.meshes[0].primitives;

	t.is(primitiveDefs.length, mesh.listPrimitives().length, 'writes all primitives');
	t.deepEqual(
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
		'primitiveDef 1/4',
	);
	t.deepEqual(
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
		'primitiveDef 2/3',
	);
	t.deepEqual(
		primitiveDefs[2],
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
		'primitiveDef 3/3',
	);
	t.deepEqual(jsonDoc.json.extensionsUsed, ['KHR_draco_mesh_compression'], 'included in extensionsUsed');

	io = await createDecoderIO();
	const roundtripDoc = await io.readJSON(jsonDoc);
	const roundtripNode = roundtripDoc.getRoot().listNodes()[0];
	const bbox = getBounds(roundtripNode);
	t.deepEqual(
		bbox.min.map((v) => +v.toFixed(3)),
		[0, -1, -1],
		'round trip (min)',
	);
	t.deepEqual(
		bbox.max.map((v) => +v.toFixed(3)),
		[1, 1, 1],
		'round trip (max)',
	);
});

test('encoding skipped', async (t) => {
	// Cases:
	// (1) Non-indexed.
	// (2) Non-TRIANGLES.

	const document = new Document().setLogger(logger);
	document.createExtension(KHRDracoMeshCompression).setRequired(true);

	const buffer = document.createBuffer();
	const prim1 = createMeshPrimitive(document, buffer);
	const prim2 = createMeshPrimitive(document, buffer);

	prim1.getIndices().dispose();
	prim2.setMode(Primitive.Mode.TRIANGLE_FAN);

	const mesh = document.createMesh().addPrimitive(prim1).addPrimitive(prim2);

	const io = await createEncoderIO();
	const jsonDoc = await io.writeJSON(document, { format: Format.GLB });
	const primitiveDefs = jsonDoc.json.meshes[0].primitives;

	t.is(primitiveDefs.length, mesh.listPrimitives().length, 'writes all primitives');
	t.deepEqual(
		primitiveDefs[0],
		{
			mode: Primitive.Mode.TRIANGLES,
			attributes: { POSITION: 0 },
		},
		'primitiveDef 1/2',
	);
	t.deepEqual(
		primitiveDefs[1],
		{
			mode: Primitive.Mode.TRIANGLE_FAN,
			indices: 1,
			attributes: { POSITION: 2 },
		},
		'primitiveDef 2/2',
	);
	t.falsy(jsonDoc.json.extensionsUsed, 'omitted from extensionsUsed');
});

test('encoding sparse', async (t) => {
	const document = new Document().setLogger(logger);
	document.createExtension(KHRDracoMeshCompression).setRequired(true);

	const buffer = document.createBuffer();
	const sparseAccessor = document
		.createAccessor()
		.setArray(new Uint32Array([0, 0, 0, 0, 25, 0]))
		.setSparse(true);
	const prim = createMeshPrimitive(document, buffer).setAttribute('_SPARSE', sparseAccessor);
	const mesh = document.createMesh().addPrimitive(prim);

	const io = await createEncoderIO();
	const jsonDoc = await io.writeJSON(document, { format: Format.GLB });
	const primitiveDefs = jsonDoc.json.meshes[0].primitives;
	const accessorDefs = jsonDoc.json.accessors;

	t.is(primitiveDefs.length, mesh.listPrimitives().length, 'writes all primitives');
	t.deepEqual(
		primitiveDefs[0],
		{
			mode: Primitive.Mode.TRIANGLES,
			indices: 0,
			attributes: { POSITION: 1, _SPARSE: 2 },
			extensions: {
				KHR_draco_mesh_compression: {
					bufferView: 2,
					attributes: { POSITION: 0 },
				},
			},
		},
		'primitiveDef',
	);
	t.is(accessorDefs[1].count, 6, 'POSITION count');
	t.is(accessorDefs[2].count, 6, '_SPARSE count');
	t.is(accessorDefs[1].sparse, undefined, 'POSITION not sparse');
	t.is(accessorDefs[2].sparse.count, 1, '_SPARSE sparse');
});

test('mixed indices', async (t) => {
	const document = new Document().setLogger(logger);
	document.createExtension(KHRDracoMeshCompression).setRequired(true);

	const buffer = document.createBuffer();
	const prim1 = createMeshPrimitive(document, buffer);
	const prim2 = prim1.clone();

	prim2.setIndices(
		document
			.createAccessor()
			.setArray(new Uint32Array([0, 1, 2, 3, 4, 5]))
			.setBuffer(buffer),
	);

	document.createMesh().addPrimitive(prim1).addPrimitive(prim2);

	const io = await createEncoderIO();
	const jsonDoc = await io.writeJSON(document, { format: Format.GLB });
	const primitiveDefs = jsonDoc.json.meshes[0].primitives;

	// The two primitives have different indices, and must be encoded as entirely separate buffer
	// views. The shared attribute accessor is cloned.
	t.deepEqual(
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
		'primitiveDef 1/2',
	);
	t.deepEqual(
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
		'primitiveDef 2/2',
	);
});

test('mixed attributes', async (t) => {
	const document = new Document().setLogger(logger);
	document.createExtension(KHRDracoMeshCompression).setRequired(true);

	const buffer = document.createBuffer();
	const prim1 = createMeshPrimitive(document, buffer);
	const prim2 = prim1.clone();

	prim2.setAttribute(
		'COLOR_0',
		document
			.createAccessor()
			.setType(Accessor.Type.VEC3)
			.setArray(
				new Float32Array([
					0, 0, 0, 0.15, 0.15, 0.15, 0.3, 0.3, 0.3, 0.45, 0.45, 0.45, 0.6, 0.6, 0.6, 0.75, 0.75, 0.75,
				]),
			)
			.setBuffer(buffer),
	);

	document.createMesh().addPrimitive(prim1).addPrimitive(prim2);

	const io = await createEncoderIO();
	const jsonDoc = await io.writeJSON(document, { format: Format.GLB });
	const primitiveDefs = jsonDoc.json.meshes[0].primitives;

	// The two primitives have different attributes, and must be encoded as entirely separate
	// buffer views. The shared indices accessor is cloned.
	t.deepEqual(
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
		'primitiveDef 1/2',
	);
	// Order of attributes reverses, because shared POSITION is cloned.
	t.deepEqual(
		primitiveDefs[1],
		{
			mode: Primitive.Mode.TRIANGLES,
			indices: 2,
			attributes: { COLOR_0: 3, POSITION: 4 },
			extensions: {
				KHR_draco_mesh_compression: {
					bufferView: 1,
					attributes: { COLOR_0: 0, POSITION: 1 },
				},
			},
		},
		'primitiveDef 2/2',
	);
});

test('non-primitive parent', async (t) => {
	const document = new Document().setLogger(logger);
	document.createExtension(KHRDracoMeshCompression).setRequired(true);

	const prim = createMeshPrimitive(document, document.createBuffer());
	prim.addTarget(document.createPrimitiveTarget().setAttribute('POSITION', prim.getAttribute('POSITION')));
	document.createMesh().addPrimitive(prim);

	const io = await createEncoderIO();
	await t.throwsAsync(
		() => io.writeJSON(document, { format: Format.GLB }),
		{ message: /indices or vertex attributes/ },
		'invalid accessor reuse',
	);
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
			.setLogger(logger)
			.registerExtensions([KHRDracoMeshCompression])
			.registerDependencies({ 'draco3d.decoder': decoder });
	});

	return decoderIO;
}

async function createEncoderIO(): Promise<NodeIO> {
	if (encoderIO) return encoderIO;

	encoderIO = createEncoderModule().then((encoder) => {
		return new NodeIO()
			.setLogger(logger)
			.registerExtensions([KHRDracoMeshCompression])
			.registerDependencies({ 'draco3d.encoder': encoder });
	});

	return encoderIO;
}
