import path from 'path';
import test from 'ava';
import { Document, NodeIO } from '@gltf-transform/core';
import { partition } from '@gltf-transform/functions';
import { createTorusKnotPrimitive, logger } from '@gltf-transform/test-utils';

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
