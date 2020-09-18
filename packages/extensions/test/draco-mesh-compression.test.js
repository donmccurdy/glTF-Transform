require('source-map-support').install();

const test = require('tape');
const path = require('path');
const { NodeIO } = require('@gltf-transform/core');
const { bounds } = require('@gltf-transform/lib');
const { DracoMeshCompression } = require('../');
const { createDecoderModule } = require('../../cli/vendor/draco3dgltf/draco3dgltf.js');

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

