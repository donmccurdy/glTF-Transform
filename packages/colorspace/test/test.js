require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');

const { NodeIO } = require('@gltf-transform/core');
const { colorspace } = require('../');


test('@gltf-transform/colorspace', t => {
  const input = [ 0.25882352941176473, 0.5215686274509804, 0.9568627450980393 ]; // sRGB
  const expected = [ 0.054480276435339814, 0.23455058215026167, 0.9046611743890203 ]; // linear

  const io = new NodeIO(fs, path);
  const container = io.read(path.join(__dirname, 'in/Parrot.glb'));

  const colorAccessorIndex = container.json.meshes[0].primitives[0].attributes['COLOR_0'];
  const colorArray = container.getAccessorArray(colorAccessorIndex);
  colorArray.set(input);

  colorspace(container, {inputEncoding: 'sRGB'});

  const actual = colorArray.slice(0, 4);

  t.equals(actual[0].toFixed(3), expected[0].toFixed(3), 'color.r');
  t.equals(actual[1].toFixed(3), expected[1].toFixed(3), 'color.g');
  t.equals(actual[2].toFixed(3), expected[2].toFixed(3), 'color.b');
  t.end();
});
