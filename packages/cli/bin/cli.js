#!/usr/bin/env node

// Uncomment for better stack traces during local development.
// require('source-map-support').install();

const { program, programReady } = require('../');

program.disableGlobalOption('--silent');
programReady.then(() => program.run());
