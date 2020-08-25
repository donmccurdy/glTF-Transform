#!/usr/bin/env node

const { program } = require('../');
program.disableGlobalOption('--silent');
program.run();
