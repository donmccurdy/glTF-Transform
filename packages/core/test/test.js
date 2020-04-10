require('source-map-support').install();

const fs = require('fs');
const test = require('tape');
const glob = require('glob');
const path = require('path');
const { GLTFUtil, NodeIO, Root, Graph, Node } = require('../');

// function ensureDir(uri) {
//   const outdir = path.dirname(uri);
//   if (!fs.existsSync(outdir)) fs.mkdirSync(outdir);
// }

// test('@gltf-transform/core::io -- glb', t => {
//   glob.sync(path.join(__dirname, 'in', '**/*.glb')).forEach((inputURI) => {
//     const basepath = inputURI.replace(path.join(__dirname, 'in'), '');
//     const outputURI = path.join(__dirname, 'out', basepath);

//     const io = new NodeIO(fs, path);
//     const container = io.read(inputURI);

//     if (process.env.REGEN) {
//       ensureDir(outputURI);
//       io.writeGLB(outputURI, container);
//     } else {
//       const expectedContainer = io.read(outputURI);
//       t.ok(container.equals(expectedContainer), `Read/write "${basepath}".`);
//     }
//   });
//   t.end();
// });

// test('@gltf-transform/core::io -- gltf', t => {
//   glob.sync(path.join(__dirname, 'in', '**/*.gltf')).forEach((inputURI) => {
//     const basepath = inputURI.replace(path.join(__dirname, 'in'), '');
//     const outputURI = path.join(__dirname, 'out', basepath);

//     const io = new NodeIO(fs, path);
//     const container = io.read(inputURI);

//     if (process.env.REGEN) {
//       ensureDir(outputURI);
//       io.writeGLTF(outputURI, container);
//     } else {
//       const expectedContainer = io.read(outputURI);
//       t.ok(container.equals(expectedContainer), `Read/write "${basepath}".`);
//     }
//   });
//   t.end();
// });

test('@gltf-transform/core::analyze', (t) => {
  const filename = path.join(__dirname, 'in', 'BoxVertexColors.glb');
  const container = new NodeIO(fs, path).readGLB(filename);
  const report = GLTFUtil.analyze(container);
  t.deepEqual(report, {
    meshes: 1,
    textures: 0,
    images: 0,
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

test('@gltf-transform/core::io -- glb', t => {
  glob.sync(path.join(__dirname, 'in', '**/*.glb')).forEach((inputURI) => {
    const basepath = inputURI.replace(path.join(__dirname, 'in'), '');

    const io = new NodeIO(fs, path);
    const container = io.read_v2(inputURI);

    t.ok(container, `Read "${basepath}".`)
  });
  t.end();
});


test('@gltf-transform/core::io -- gltf', t => {
  glob.sync(path.join(__dirname, 'in', '**/*.gltf')).forEach((inputURI) => {
    const basepath = inputURI.replace(path.join(__dirname, 'in'), '');

    const io = new NodeIO(fs, path);
    const container = io.read_v2(inputURI);

    t.ok(container, `Read "${basepath}".`)
  });
  t.end();
});

test('@gltf-transform/core::graph', t => {
  const graph = new Graph();
  const root = new Root(graph);
  const a = new Node(graph);
  const b = new Node(graph);

  root.addNode(a).addNode(b);
  t.deepEqual(root.listNodes(), [a, b], 'Added two nodes.');

  root.removeNode(a);
  t.deepEqual(root.listNodes(), [b], 'Removed a node.');

  b.dispose();
  t.deepEqual(root.listNodes(), [], 'Disposed a node.');

  // Subjective behavior, but might as well unit test it.
  root.addNode(a).addNode(b).addNode(b).addNode(b);
  t.deepEqual(root.listNodes(), [a, b, b, b], 'Added duplicate nodes.');
  root.removeNode(b);
  t.deepEqual(root.listNodes(), [a], 'Removed a duplicate node.');
  root.removeNode(b).removeNode(b).removeNode(b);
  t.deepEqual(root.listNodes(), [a], 'Removed a non-present node repeatedly.');

  a.detach();
  t.deepEqual(root.listNodes(), [], 'Detached a node.');

  root.addNode(b);
  root.dispose();
  t.deepEqual(root.listNodes(), [], 'Disposed the root, confirmed empty.');
  t.equal(root.isDisposed(), true, 'Disposed the root, confirmed disposed.');

  t.end();
});