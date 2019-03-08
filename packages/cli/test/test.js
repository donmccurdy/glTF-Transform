const fs = require('fs');
const package = require('../package.json');
const source = fs.readFileSync(__dirname + '/../src/cli.js', 'utf8');

const actualDeps = new Set(Object.keys(package.dependencies));
const ignoredDeps = new Set(['fs', 'path', '../package.json']);
const expectedDeps = source.match(/require\('(.*)'\);/g)
    .map((line) => line.match(/require\('(.*)'\);/)[1])
    .filter((dep) => !ignoredDeps.has(dep));

for (const dep of expectedDeps) {
    if (!actualDeps.has(dep)) {
        throw new Error(`Expected dependency, "${dep}", not found.`);
    }
}

if (expectedDeps.length !== actualDeps.size) {
    throw new Error(`Number of dependencies do not match. Expected actualDeps.size and found ${expectedDeps.length}.`)
}

console.log(' ✅  CLI dependencies are consistent.');
