require('source-map-support').install();

const fs = require('fs');
const test = require('tape');
const glob = require('glob');
const path = require('path');
const { GLTFUtil, NodeIO } = require('../');

function ensureDir(uri) {
  const outdir = path.dirname(uri);
  if (!fs.existsSync(outdir)) fs.mkdirSync(outdir);
}

test('gltf-transform-util::io -- glb', t => {
  glob.sync(path.join(__dirname, 'in', '**/*.glb')).forEach((inputURI) => {
    const basepath = inputURI.replace(path.join(__dirname, 'in'), '');
    const outputURI = path.join(__dirname, 'out', basepath);

    const io = new NodeIO(fs, path);
    const container = io.read(inputURI);

    if (process.env.REGEN) {
      ensureDir(outputURI);
      io.writeGLB(outputURI, container);
    } else {
      const expectedContainer = io.read(outputURI);
      t.ok(container.equals(expectedContainer), `Read/write "${basepath}".`);
    }
  });
  t.end();
});

test('gltf-transform-util::io -- gltf', t => {
  glob.sync(path.join(__dirname, 'in', '**/*.gltf')).forEach((inputURI) => {
    const basepath = inputURI.replace(path.join(__dirname, 'in'), '');
    const outputURI = path.join(__dirname, 'out', basepath);

    const io = new NodeIO(fs, path);
    const container = io.read(inputURI);

    if (process.env.REGEN) {
      ensureDir(outputURI);
      io.writeGLTF(outputURI, container);
    } else {
      const expectedContainer = io.read(outputURI);
      t.ok(container.equals(expectedContainer), `Read/write "${basepath}".`);
    }
  });
  t.end();
});

test('gltf-transform-util::analyze', (t) => {
  const filename = path.join(__dirname, 'in', 'BoxVertexColors.glb');
  const container = new NodeIO(fs, path).readGLB(filename);
  const report = GLTFUtil.analyze(container);
  t.deepEqual(report, {
    meshes: 1,
    textures: 0,
    materials: 1,
    animations: 0,
    primitives: 1,
    dataUsage: {
      geometry: 1224,
      targets: 0,
      animation: 0,
      textures: 0,
      json: 1647
    }
  }, 'BoxVertexColors.glb -- analysis');
  t.end();
});
