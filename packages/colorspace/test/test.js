require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');

const { NodeIO } = require('@gltf-transform/core');
const { colorspace } = require('../');


test('@gltf-transform/colorspace', t => {
  const io = new NodeIO(fs, path);
  const input = io.read(path.join(__dirname, 'in/Parrot.glb'));
  const expected = io.read(path.join(__dirname, 'out/Parrot.glb'));
  colorspace(input, {inputEncoding: 'sRGB'});
  t.ok(input.equals(expected), 'converts vertex colors from sRGB to linear');
  t.end();
});
