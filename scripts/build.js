#!/usr/bin/env node

const path = require('path');
const glob = require('glob');
const { spawnSync } = require('child_process');

glob.sync(path.join(__dirname, '..', 'packages', 'gltf-transform-*', 'package.json')).forEach(filepath => {
  const { dir } = path.parse(filepath);
  const log = spawnSync('microbundle', [], { encoding: 'utf8', cwd: dir });
  console.log(String(log.stdout));
  console.error(String(log.stderr));
});
