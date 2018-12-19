require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');

const { NodeIO } = require ('@gltf-transform/util');
const { prune } = require('../');

test('@gltf-transform/split', t => {
  const io = new NodeIO(fs, path);
  const container = io.read(path.join(__dirname, 'in/many-cubes.gltf'));
  t.equal(container.json.accessors.length, 1503, 'begins with duplicate accessors');
  prune(container);
  t.equal(container.json.accessors.length, 4, 'prunes duplicate accessors');

  const outputURI = path.join(__dirname, 'out/many-cubes.gltf');
  if (process.env.REGEN) {
    io.writeGLTF(outputURI, container);
  } else {
    const expectedContainer = io.readGLTF(outputURI);
    t.ok(container.equals(expectedContainer), 'Container matches expected.');
  }
  t.end();
});
