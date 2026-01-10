#!/usr/bin/env node

import { program, programReady } from '../dist/cli.mjs';

program.disableGlobalOption('--silent');
programReady.then(() => program.run());
