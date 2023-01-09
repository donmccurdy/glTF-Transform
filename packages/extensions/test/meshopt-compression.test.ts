require('source-map-support').install();

import path from 'path';
import test from 'tape';
import { NodeIO, getBounds } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '../';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

const INPUTS = ['BoxMeshopt.glb', 'BoxMeshopt.gltf'];

test('@gltf-transform/extensions::draco-mesh-compression | decoding', async (t) => {
	await MeshoptDecoder.ready;

	const io = new NodeIO()
		.registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
		.registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

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

test('@gltf-transform/extensions::draco-mesh-compression | encoding', async (t) => {
	await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);

	const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({
		'meshopt.decoder': MeshoptDecoder,
		'meshopt.encoder': MeshoptEncoder,
	});

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
