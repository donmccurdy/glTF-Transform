const fs = require('fs');
const test = require('tape');
const package = require('../package.json');
const source = fs.readFileSync(__dirname + '/../src/cli.js', 'utf8');

const actualDeps = new Set(Object.keys(package.dependencies));
const ignoredDeps = new Set(['fs', 'path', '../package.json']);
const expectedDeps = source.match(/require\('(.*)'\);/g)
	.map((line) => line.match(/require\('(.*)'\);/)[1])
	.filter((dep) => !ignoredDeps.has(dep));

test('@gltf-transform/cli', t => {
	for (const dep of expectedDeps) {
		t.true(actualDeps.has(dep), `Has dependency: "${dep}"`);
	}
	t.equals(expectedDeps.length, actualDeps.size, 'Has expected number of dependencies');
	t.end();
});
