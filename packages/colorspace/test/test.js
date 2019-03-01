require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');

const { NodeIO } = require('@gltf-transform/core');
const { colorspace } = require('../');


test('@gltf-transform/colorspace', t => {
  const io = new NodeIO(fs, path);
  const container = io.read(path.join(__dirname, 'in/Parrot.glb'));

  colorspace(container, {inputEncoding: 'sRGB'});

  // TODO: Test the result.
  // io.write(path.join(__dirname, 'out/Parrot.glb'), container);

  t.end();
});
