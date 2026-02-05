import { defineConfig } from 'tsdown';
import baseConfig from '../../tsdown.config.ts';

export default defineConfig({
	...baseConfig,
	inlineOnly: ['keyframe-resample', 'gl-matrix'],
	// For keyframe-resample bundling. See: https://github.com/rolldown/tsdown/issues/758
	treeshake: { moduleSideEffects: false, propertyReadSideEffects: false },
});
