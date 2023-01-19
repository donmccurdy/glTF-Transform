import { resolve } from 'path';
import type { Extension, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import type { program } from '@caporal/core';
import type { Session } from './session';

// Use require() so microbundle doesn't compile these.
const draco3d = require('draco3dgltf');
const { MeshoptDecoder, MeshoptEncoder } = require('meshoptimizer');

export interface GLTFTransformCLIConfig {
	// extends?: 'default';
	extensions?: (typeof Extension)[];
	dependencies?: Record<string, unknown>;
	onProgramReady?: (params: { program: typeof program; io: NodeIO; Session: typeof Session }) => Promise<void>;
}

let customConfig: GLTFTransformCLIConfig | null = null;

export async function defineConfig(
	configProvider: GLTFTransformCLIConfig | (() => Promise<GLTFTransformCLIConfig>)
): Promise<GLTFTransformCLIConfig> {
	if (typeof configProvider === 'function') {
		configProvider = await configProvider();
	}
	return configProvider;
}

export function createDefaultConfig(): Promise<Required<GLTFTransformCLIConfig>> {
	return Promise.all([
		draco3d.createDecoderModule(),
		draco3d.createEncoderModule(),
		MeshoptDecoder.ready,
		MeshoptEncoder.ready,
	]).then(([decoder, encoder, _]) => {
		return {
			extensions: ALL_EXTENSIONS,
			dependencies: {
				'draco3d.decoder': decoder,
				'draco3d.encoder': encoder,
				'meshopt.decoder': MeshoptDecoder,
				'meshopt.encoder': MeshoptEncoder,
			},
			onProgramReady: async (_params) => {
				// no-op
			},
		};
	});
}

export function loadConfig(path: string) {
	customConfig = validateConfig(require(resolve(process.cwd(), path)));
}

export function validateConfig(config: GLTFTransformCLIConfig): GLTFTransformCLIConfig {
	for (const extension of config.extensions || []) {
		if (!extension.EXTENSION_NAME) {
			throw new Error('Invalid extension in config.extensions.');
		}
	}
	return config;
}

export async function getConfig(): Promise<Required<GLTFTransformCLIConfig>> {
	const config = await createDefaultConfig();
	if (customConfig) {
		Object.assign(config, customConfig);
	}
	return config;
}
