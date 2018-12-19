require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');
const gl = require('gl');

const { NodeIO } = require('@gltf-transform/util');
const { occlusionVertex } = require('../');


test('gltf-transform-occlusion-vertex', t => {
  const io = new NodeIO(fs, path);
  const container = io.read(path.join(__dirname, 'in/chr_knight.glb'));
  const material = container.json.materials[0];
  const mesh = container.json.meshes[0];

  t.notOk(material.occlusionTexture, 'begins without occlusionTexture');
  t.notOk(mesh.primitives[0].attributes.TEXCOORD_1, 'begins without TEXCOORD_1');
  t.equals(container.json.textures.length, 1, 'begins with one texture')

  occlusionVertex(container, {gl});

  t.ok(material.occlusionTexture, 'adds occlusionTexture');
  t.ok(mesh.primitives[0].attributes.TEXCOORD_1, 'adds TEXCOORD_1');
  t.equals(container.json.textures.length, 2, 'adds texture')

  t.end();
});
