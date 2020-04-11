require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');

const { NodeIO } = require ('@gltf-transform/core');
const { split } = require('../');

test('@gltf-transform/split', t => {

  const io = new NodeIO(fs, path);
  const container = io.read(path.join(__dirname, 'in/TwoCubes.glb'));
  t.equal(container.json.buffers.length, 1, 'initialized with one buffer');

  split(container, ['CubeA', 'CubeB']);

  t.deepEqual(container.json.buffers, [
    { uri: 'CubeA.bin', byteLength: 324, name: 'CubeA' },
    { uri: 'CubeB.bin', byteLength: 324, name: 'CubeB' }
  ], 'splits into two buffers');

  t.end();
});
