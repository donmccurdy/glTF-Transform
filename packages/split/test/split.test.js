require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');

const { NodeIO } = require ('@gltf-transform/core');
const { split } = require('../');

test('@gltf-transform/split', t => {

  const io = new NodeIO(fs, path);
  const container = io.read(path.join(__dirname, 'in/TwoCubes.glb'));
  t.equal(container.getRoot().listBuffers().length, 1, 'initialized with one buffer');

  split(container, ['CubeA', 'CubeB']);

  const asset = io.containerToAsset(container, {basename: 'split-test', isGLB: false});
  t.deepEqual(asset.json.buffers, [
    { uri: 'CubeA.bin', byteLength: 324, name: 'CubeA' },
    { uri: 'CubeB.bin', byteLength: 324, name: 'CubeB' }
  ], 'splits into two buffers');

  const bufferReferences = asset.json.bufferViews.map((b) => b.buffer);
  t.deepEquals(bufferReferences, [0,0,1,1], 'creates four buffer views');

  t.end();
});
