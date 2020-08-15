require('source-map-support').install();

import * as path from 'path';
import * as test from 'tape';
import { NodeIO } from '@gltf-transform/core';
import { bounds } from '@gltf-transform/lib';
import { createDecoderModule } from '../../cli/vendor/draco3dgltf/draco3dgltf.js';
import { DracoMeshCompression } from '../';

const io = new NodeIO()
	.registerExtensions([DracoMeshCompression])
	.registerDependencies({'draco3d.decoder': createDecoderModule()});

test('@gltf-transform/extensions::draco-mesh-compression', t => {
	const doc = io.read(path.join(__dirname, 'in', 'BoxDraco.gltf'));
	const bbox = bounds(doc.getRoot().listScenes()[0]);
	t.deepEquals(bbox.min.map(v => +v.toFixed(3)), [-0.5, -0.5, -0.5], 'decompress (min)');
	t.deepEquals(bbox.max.map(v => +v.toFixed(3)), [0.5, 0.5, 0.5], 'decompress (max)');
	t.end();
});

