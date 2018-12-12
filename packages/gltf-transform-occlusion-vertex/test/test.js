require('source-map-support').install();

const test = require('tape');
const glob = require('glob');
const path = require('path');
const load = require('load-json-file');
const write = require('write-json-file');

const { GLTFUtil, GLTFContainer } = require('gltf-transform-util');
const { occlusionVertex } = require('../');

test('gltf-transform-occlusion-vertex', t => {
  glob.sync(path.join(__dirname, 'in', '*.json')).forEach(filepath => {
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
