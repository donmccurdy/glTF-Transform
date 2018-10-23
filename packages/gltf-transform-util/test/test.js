const fs = require('fs');
const test = require('tape');
const glob = require('glob');
const path = require('path');
// const load = require('load-json-file');
// const write = require('write-json-file');
const { GLTFUtil, GLTFContainer } = require('../');
test('gltf-transform-util', t => {
  glob.sync(path.join(__dirname, 'in', '*.glb')).forEach(filepath => {
    
    const {name} = path.parse(filepath);
    const glbBuffer = fs.readFileSync(filepath);
    // Byte offset may be non-zero.
    const {byteOffset, byteLength} = glbBuffer;
    const glb = glbBuffer.buffer.slice(byteOffset, byteOffset + byteLength);
    const container = GLTFUtil.wrapGLB(glb);
    console.log(container.json);
    console.log(GLTFUtil.analyze(container));
    // etc.
    // const results = [];
    // const out = filepath.replace(path.join('test', 'in'), path.join('test', 'out'));
    // if (process.env.REGEN) write.sync(out, results);
    // t.deepEqual(results, load.sync(out), name);
  });
  t.end();
});
