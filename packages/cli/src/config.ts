import type { Extension, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { resolve } from 'path';
import draco3d from 'draco3dgltf';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import type { Session } from './session.js';
import { program } from './program.js';

interface Config {
	extensions: (typeof Extension)[];
	dependencies: Record<string, unknown>;
	onProgramReady?: (params: { program: typeof program; io: NodeIO; Session: typeof Session }) => Promise<void>;
}

export type CustomConfig = Partial<Config>;

type ConfigModule = { default: CustomConfig };

let customConfigPromise: Promise<ConfigModule> | null = null;

export async function defineConfig(
	configProvider: CustomConfig | (() => Promise<CustomConfig>),
): Promise<CustomConfig> {
	if (typeof configProvider === 'function') {
		configProvider = await configProvider();
	}
	return configProvider;
}

export function createDefaultConfig(): Promise<Config> {
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
			onProgramReady: undefined,
		};
	});
}

export function loadConfig(path: string) {
	path = resolve(process.cwd(), path);
	path = `file:${path}`; // Required on Windows.
	customConfigPromise = import(path).then(validateConfig) as Promise<ConfigModule>;
}

export function validateConfig(config: CustomConfig): CustomConfig {
	for (const extension of config.extensions || []) {
		if (!extension.EXTENSION_NAME) {
			throw new Error('Invalid extension in config.extensions.');
		}
	}
	return config;
}

export async function getConfig(): Promise<Config> {
	const config = await createDefaultConfig();
	if (customConfigPromise) {
		const { default: customConfig } = await customConfigPromise;
		Object.assign(config, customConfig);
	}
	return config;
}
