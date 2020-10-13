#!/usr/bin/env node

// Uncomment for better stack traces during local development.
// require('source-map-support').install();

const { program } = require('../');
program.disableGlobalOption('--silent');
program.run();
