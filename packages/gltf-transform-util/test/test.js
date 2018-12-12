require('source-map-support').install();

const fs = require('fs');
const test = require('tape');
const glob = require('glob');
const path = require('path');
// const load = require('load-json-file');
// const write = require('write-json-file');
const { GLTFUtil, GLTFContainer } = require('../');

test('gltf-transform-util::io', t => {
  glob.sync(path.join(__dirname, 'in', '*.glb')).forEach(filepath => {
    
    let {name} = path.parse(filepath);
    name = name.replace(/\.glb|\.gltf/, '');

    const glbBuffer = fs.readFileSync(filepath);
    // Byte offset may be non-zero.
    const {byteOffset, byteLength} = glbBuffer;
    const glb = glbBuffer.buffer.slice(byteOffset, byteOffset + byteLength);
    const container = GLTFUtil.wrapGLB(glb);

    const {json, resources} = GLTFUtil.bundleGLTF(container);

    const out = path.join(__dirname, 'out', name);
    if (!fs.existsSync(out)) { fs.mkdirSync(out); }
  
    if (process.env.REGEN) {
      fs.writeFileSync(path.join(out, `${name}.gltf`), JSON.stringify(json));
      Object.keys(resources).forEach((resourceName) => {
        const resource = new Buffer(resources[resourceName]);
        fs.writeFileSync(path.join(out, resourceName), resource);
      });
    } else {
      const expected = fs.readFileSync(path.join(out, `${name}.gltf`), 'utf8');
      t.equal(expected, JSON.stringify(json),  `${name} JSON`);
      Object.keys(resources).forEach((resourceName) => {
        const resource = new Buffer(resources[resourceName]);
        const expected = fs.readFileSync(path.join(out, resourceName));
        t.equal(resource.equals(expected), true, `${name} -- ${resourceName}`);
      });
    }
  });
  t.end();
});

test('gltf-transform-util::analyze', (t) => {
  const filename = path.join(__dirname, 'in', 'BoxVertexColors.glb');
  const glbBuffer = fs.readFileSync(filename);
  // Byte offset may be non-zero.
  const {byteOffset, byteLength} = glbBuffer;
  const glb = glbBuffer.buffer.slice(byteOffset, byteOffset + byteLength);
  const container = GLTFUtil.wrapGLB(glb);
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
