#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const meow = require('meow');
const camelcase = require('camelcase');
const uppercamelcase = require('uppercamelcase');
const decamelize = require('decamelize');
const load = require('load-json-file');

const cli = meow(`
    Usage:
      $ ./scripts/create-new-module <module>
    Examples:
      $ ./scripts/create-new-module clone
`);

if (!cli.input.length) cli.showHelp();
let name = cli.input[0];

// Normalize module name
// gltf-transform-clone => clone
name = name.replace(/gltf-transform-/i, '');
const camelcaseName = camelcase(name);
const uppercamelcaseName = uppercamelcase(name);
const decamelizeName = decamelize(name);

// Create Folder
const folderPath = path.join(__dirname, '..', 'packages', `gltf-transform-${decamelizeName}`);
if (!fs.existsSync(folderPath)) {
  fs.mkdirSync(folderPath);
  fs.mkdirSync(path.join(folderPath, 'dist'));
  fs.mkdirSync(path.join(folderPath, 'src'));
  fs.mkdirSync(path.join(folderPath, 'typings'));
}

// Create index.js
const indexPath = path.join(folderPath, 'src', 'index.ts');
if (!fs.existsSync(indexPath)) {
  fs.writeFileSync(indexPath, `import { GLTFContainer } from 'gltf-transform-util';`);
}

// Create package.json
const pkg = load.sync(path.join(__dirname, '..', 'scripts', 'tpl-package.json'));
pkg.name = `gltf-transform-${decamelizeName}`;
pkg.main = `dist/gltf-transform-${decamelizeName}.js`;
pkg.module = `dist/gltf-transform-${decamelizeName}.module.js`;
fs.writeFileSync(path.join(folderPath, 'package.json'), JSON.stringify(pkg, null, 2));

// Create LICENSE
const license = path.join(__dirname, '..', 'LICENSE');
fs.copySync(license, path.join(folderPath, 'LICENSE'));

// Create tsconfig.json
const tsconfig = path.join(__dirname, '..', 'tsconfig.json');
fs.copySync(tsconfig, path.join(folderPath, 'tsconfig.json'));

// Create typings
const typings = path.join(__dirname, '..', 'typings', 'gltf.d.ts');
fs.copySync(typings, path.join(folderPath, 'typings', 'gltf.d.ts'));

// Create test.js
const testPath = path.join(folderPath, 'test', 'test.js');
if (!fs.existsSync(testPath)) {
  fs.mkdirSync(path.join(folderPath, 'test'));
  fs.mkdirSync(path.join(folderPath, 'test/in'));
  fs.mkdirSync(path.join(folderPath, 'test/out'));
  fs.writeFileSync(testPath, `const test = require('tape');
const glob = require('glob');
const path = require('path');
const load = require('load-json-file');
const write = require('write-json-file');

const { GLTFUtil, GLTFContainer } = require('gltf-transform-util');
const { ${camelcaseName} } = require('../');

test('gltf-transform-${decamelizeName}', t => {
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
`);
}

// Create README.md
let readme = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'tpl-readme.md'), 'utf8');
readme = readme.replace(/\{name\}/g, `glTF-Transform-${uppercamelcaseName}`);
readme = readme.replace(/\{module\}/g, `gltf-transform-${decamelizeName}`);
readme = readme.replace(/\{fn\}/g, camelcaseName);
fs.writeFileSync(path.join(folderPath, 'README.md'), readme);
