const test = require('tape');
const glob = require('glob');
const path = require('path');
const load = require('load-json-file');
const write = require('write-json-file');

const { GLTFUtil, GLTFContainer } = require ('gltf-transform');
const { split } = require('../');

test('gltf-transform-split', t => {
  glob.sync(path.join(__dirname, 'in', '*.gltf')).forEach(filepath => {
    const {name} = path.parse(filepath);
    const json = load.sync(filepath);
    const model = GLTFUtil.wrapGLTF(json, {});
    t.equal(model.json.buffers.length, 1, 'initialized with one buffer');
    split(model, ['CubeA', 'CubeB']);
    // TODO: This should be two, not three.
    t.deepEqual(model.json.buffers, [
      { byteLength: 36, uri: 'buffer0.bin' },
      { uri: 'CubeA.bin', byteLength: 288 },
      { uri: 'CubeB.bin', byteLength: 324 }
    ], 'splits into three buffers');

    // const results = [];
    // const out = filepath.replace(path.join('test', 'in'), path.join('test', 'out'));
    // if (process.env.REGEN) write.sync(out, results);
  });
  t.end();
});
