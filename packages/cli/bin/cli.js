#!/usr/bin/env node

import { program, programReady } from '../dist/cli.esm.js';

program.disableGlobalOption('--silent');
programReady.then(() => program.run());
