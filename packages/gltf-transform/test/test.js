const test = require('tape');
const glob = require('glob');
const path = require('path');
const load = require('load-json-file');
const write = require('write-json-file');
const { GLTFUtil, GLTFContainer } = require('../');
test('gltf-transform-core', t => {
  glob.sync(path.join(__dirname, 'test', 'in', '*.json')).forEach(filepath => {
    // Define params
    const {name} = path.parse(filepath);
    const gltf = load.sync(filepath);
    // etc.
    const results = [];
    const out = filepath.replace(path.join('test', 'in'), path.join('test', 'out'));
    if (process.env.REGEN) write.sync(out, results);
    t.deepEqual(results, load.sync(out), name);
  });
  t.end();
});
