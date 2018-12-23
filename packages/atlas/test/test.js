require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');
const {createCanvas, Image} = require('canvas');

const { NodeIO } = require('@gltf-transform/core');
const { atlas } = require('../');

test('@gltf-transform/atlas', t => {
  const io = new NodeIO(fs, path);
  const container = io.read('test/in/VC_glTF/VC.gltf');
  // atlas(container, {size: 2048, createCanvas, createImage: () =>  new Image()}).then(() => {
  //   // console.log(container);
  //   io.write('test/out/VC_glTF/VC.gltf', container);

  // });
  t.end();
});
