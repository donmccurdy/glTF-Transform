import { Document, NodeIO } from '@gltf-transform/core';
import { partition } from '@gltf-transform/functions';
import { createTorusKnotPrimitive, logger } from '@gltf-transform/test-utils';
import test from 'ava';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

test('basic', async (t) => {
	const io = new NodeIO().setLogger(logger);
	const document = await io.read(path.join(__dirname, 'in/TwoCubes.glb'));
	document.setLogger(logger);
	t.is(document.getRoot().listBuffers().length, 1, 'initialized with one buffer');

	await document.transform(partition({ meshes: [] }));
	await document.transform(partition({ meshes: false }));

	t.is(document.getRoot().listBuffers().length, 1, 'has no effect when disabled');

	await document.transform(partition({ meshes: ['CubeA', 'CubeB'] }));

	const jsonDoc = await io.writeJSON(document, { basename: 'partition-test' });
	t.deepEqual(
		jsonDoc.json.buffers,
		[
			{ uri: 'CubeA.bin', byteLength: 324, name: 'CubeA' },
			{ uri: 'CubeB.bin', byteLength: 324, name: 'CubeB' },
		],
		'partitions into two buffers',
	);

	const bufferReferences = jsonDoc.json.bufferViews.map((b) => b.buffer);
	t.deepEqual(bufferReferences, [0, 0, 1, 1], 'creates four buffer views');
});

test('valid and unique URIs', async (t) => {
	const io = new NodeIO().setLogger(logger);
	const document = new Document().setLogger(logger);
	document.createMesh('../%$mesh-001!').addPrimitive(createTorusKnotPrimitive(document, { tubularSegments: 12 }));
	document.createMesh('../%$mesh-002!').addPrimitive(createTorusKnotPrimitive(document, { tubularSegments: 12 }));
	document.createMesh('../%$mesh-002!').addPrimitive(createTorusKnotPrimitive(document, { tubularSegments: 12 }));

	await document.transform(partition({ meshes: true }));

	const jsonDocument = await io.writeJSON(document, { basename: 'partition-test' });
	t.deepEqual(
		jsonDocument.json.buffers,
		[
			{ uri: 'mesh-001.bin', byteLength: 6048, name: '../%$mesh-001!' },
			{ uri: 'mesh-002.bin', byteLength: 6048, name: '../%$mesh-002!' },
			{ uri: 'mesh-002_1.bin', byteLength: 6048, name: '../%$mesh-002!' },
		],
		'partitions into three buffers',
	);
});

test('partition limit', async (t) => {
	// Initialize IO and document with logger.
	const io = new NodeIO().setLogger(logger);
	const document = new Document().setLogger(logger);

	// Create four meshes with non-standard names that include special characters.
	// Two of them share the same name to test URI uniqueness.
	document.createMesh('../%$mesh-001!').addPrimitive(createTorusKnotPrimitive(document, { tubularSegments: 12 }));
	document.createMesh('../%$mesh-002!').addPrimitive(createTorusKnotPrimitive(document, { tubularSegments: 12 }));
	document.createMesh('../%$mesh-002!').addPrimitive(createTorusKnotPrimitive(document, { tubularSegments: 12 }));
	document.createMesh('../%$mesh-002!').addPrimitive(createTorusKnotPrimitive(document, { tubularSegments: 12 }));

	// Apply the `partition()` transform with a `maxPartitions` limit of 3.
	// This means only 3 meshes will be split into separate buffers,
	// and the rest will be grouped into a shared buffer.
	await document.transform(partition({ meshes: true, maxPartitions: 3 }));

	// Serialize the document to JSON to inspect the buffer URIs.
	const jsonDocument = await io.writeJSON(document, { basename: 'partition-test' });

	// Validate the result:
	// - One shared buffer for overflow meshes (partition-test_1.bin).
	// - One buffer for mesh-001.
	// - Two buffers for mesh-002 (with unique URIs: mesh-002.bin and mesh-002_1.bin).
	t.deepEqual(
		jsonDocument.json.buffers,
		[
			{ uri: 'partition-test_1.bin', byteLength: 6048 },
			{ uri: 'mesh-001.bin', byteLength: 6048, name: '../%$mesh-001!' },
			{ uri: 'mesh-002.bin', byteLength: 6048, name: '../%$mesh-002!' },
			{ uri: 'mesh-002_1.bin', byteLength: 6048, name: '../%$mesh-002!' },
		],
		'partitions into three buffers',
	);
});
