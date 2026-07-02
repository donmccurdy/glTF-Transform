import { defineConfig } from 'tsdown';
import baseConfig from '../../tsdown.config.ts';

export default defineConfig({
	...baseConfig,
	deps: {
		onlyBundle: ['gl-matrix'],
		neverBundle: ['node:fs', 'node:path'],
	},
});
