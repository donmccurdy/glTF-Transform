require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');

const { NodeIO } = require ('gltf-transform-util');
const { split } = require('../');

test('gltf-transform-split', t => {

  const io = new NodeIO(fs, path);
  const container = io.read(path.join(__dirname, 'in/TwoCubes.glb'));
  t.equal(container.json.buffers.length, 1, 'initialized with one buffer');

  split(container, ['CubeA', 'CubeB']);
  // TODO: This should be two, not three.
  t.deepEqual(container.json.buffers, [
    { uri: 'resources.bin', byteLength: 36, name: 'TwoCubes', },
    { uri: 'CubeA.bin', byteLength: 288, name: 'CubeA' },
    { uri: 'CubeB.bin', byteLength: 324, name: 'CubeB' }
  ], 'splits into three buffers');

  t.end();
});
