import { defineConfig } from 'tsdown';
import baseConfig from '../../tsdown.config.ts';

export default defineConfig({
	...baseConfig,
	deps: {
		onlyBundle: ['gl-matrix'],

		// Omit `node:` scheme in `packages/core/src/**/*.ts` for Webpack 5.
		// See: https://github.com/donmccurdy/glTF-Transform/pull/1860
		neverBundle: ['fs', 'path'],
	},
});
