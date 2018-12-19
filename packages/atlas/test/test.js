require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');

const { NodeIO } = require('@gltf-transform/core');
const { atlas } = require('../');

test('@gltf-transform/atlas', t => {
  // ...
  t.end();
});
