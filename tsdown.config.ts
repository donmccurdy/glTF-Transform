import { defineConfig } from 'tsdown';

export default defineConfig({
	format: ['esm', 'cjs'],
	platform: 'neutral',
	treeshake: { moduleSideEffects: false },
	// For gl-matrix bundling. See: https://tsdown.dev/options/platform#module-resolution
	inputOptions: { resolve: { mainFields: ['module', 'main'] } },
});
