require('source-map-support').install();

import path from 'path';
import test from 'tape';
import { NodeIO } from '@gltf-transform/core';
import { bounds } from '@gltf-transform/functions';
import { MeshoptCompression, MeshQuantization } from '../';

// See: https://github.com/substack/tape/issues/514
const MeshoptDecoder = require('../vendor/meshopt_decoder.js');

test('@gltf-transform/extensions::draco-mesh-compression | decoding', async t => {
    await MeshoptDecoder.ready;

	const io = new NodeIO()
        .registerExtensions([MeshoptCompression, MeshQuantization])
        .registerDependencies({'meshopt.decoder': MeshoptDecoder});

    const doc = io.read(path.join(__dirname, 'in', 'BoxMeshopt.glb'));
	const bbox = bounds(doc.getRoot().listScenes()[0]);
	t.deepEquals(bbox.min.map(v => +v.toFixed(3)), [-0.5, -0.5, -0.5], 'decompress (min)');
	t.deepEquals(bbox.max.map(v => +v.toFixed(3)), [0.5, 0.5, 0.5], 'decompress (max)');
	t.end();
});
