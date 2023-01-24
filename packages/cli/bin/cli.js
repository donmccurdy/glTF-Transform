#!/usr/bin/env node

// Uncomment for better stack traces during local development.
// require('source-map-support').install();

import { program, programReady } from '../dist/cli.esm.js';

program.disableGlobalOption('--silent');
programReady.then(() => program.run());
