import { defineConfig } from 'tsdown';
import baseConfig from '../../tsdown.config.ts';

export default defineConfig({ ...baseConfig, format: 'esm', platform: 'node' });
