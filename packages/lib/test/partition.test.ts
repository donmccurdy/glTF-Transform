require('source-map-support').install();

import path from 'path';
import test from 'tape';
import { Logger, NodeIO } from '@gltf-transform/core';
import { partition } from '../';

test('@gltf-transform/lib::partition', t => {

	const io = new NodeIO();
	const doc = io.read(path.join(__dirname, 'in/TwoCubes.glb'))
		.setLogger(new Logger(Logger.Verbosity.SILENT));
	t.equal(doc.getRoot().listBuffers().length, 1, 'initialized with one buffer');

	partition({meshes: []})(doc);
	partition({meshes: false})(doc);

	t.equal(doc.getRoot().listBuffers().length, 1, 'has no effect when disabled');

	partition({meshes: ['CubeA', 'CubeB']})(doc);

	const jsonDoc = io.writeJSON(doc, {basename: 'partition-test', isGLB: false});
	t.deepEqual(jsonDoc.json.buffers, [
		{ uri: 'CubeA.bin', byteLength: 324, name: 'CubeA' },
		{ uri: 'CubeB.bin', byteLength: 324, name: 'CubeB' }
	], 'partitions into two buffers');

	const bufferReferences = jsonDoc.json.bufferViews.map((b) => b.buffer);
	t.deepEquals(bufferReferences, [0, 0, 1, 1], 'creates four buffer views');

	t.end();
});
