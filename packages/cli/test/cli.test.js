const fs = require('fs');
const test = require('tape');
const package = require('../package.json');
const source = fs.readFileSync(__dirname + '/../src/cli.js', 'utf8');

test('@gltf-transform/cli', t => {
	t.end();
});
