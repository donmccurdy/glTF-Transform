import { defineConfig } from 'tsdown';
import baseConfig from '../../tsdown.config.ts';

export default defineConfig({
	...baseConfig,
	inlineOnly: ['gl-matrix'],
	external: ['node:fs', 'node:path'],
});
