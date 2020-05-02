require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');

const { Logger, NodeIO } = require ('@gltf-transform/core');
const { split } = require('../');

test('@gltf-transform/split', t => {

  const io = new NodeIO(fs, path);
  const doc = io.read(path.join(__dirname, 'in/TwoCubes.glb'))
	.setLogger(new Logger(Logger.Verbosity.SILENT));
  t.equal(doc.getRoot().listBuffers().length, 1, 'initialized with one buffer');

  split()(doc);

  t.equal(doc.getRoot().listBuffers().length, 1, 'has no effect when disabled');

  split({meshes: ['CubeA', 'CubeB']})(doc);

  const nativeDoc = io.createNativeDocument(doc, {basename: 'split-test', isGLB: false});
  t.deepEqual(nativeDoc.json.buffers, [
    { uri: 'CubeA.bin', byteLength: 324, name: 'CubeA' },
    { uri: 'CubeB.bin', byteLength: 324, name: 'CubeB' }
  ], 'splits into two buffers');

  const bufferReferences = nativeDoc.json.bufferViews.map((b) => b.buffer);
  t.deepEquals(bufferReferences, [0,0,1,1], 'creates four buffer views');

  t.end();
});
