import { PlatformIO, WebIO, NodeIO, Logger } from '@gltf-transform/core';

export enum Environment {
	WEB,
	DENO,
	NODE,
}

export const environment = (typeof window !== 'undefined' ? Environment.WEB : Environment.NODE) as Environment;

export const logger = new Logger(Logger.Verbosity.SILENT);

export const createPlatformIO = async (): Promise<PlatformIO> => {
	switch (environment) {
		case Environment.WEB:
			return new WebIO().setLogger(logger);
		case Environment.NODE:
			return new NodeIO().setLogger(logger);
	}
};

export function resolve(path: string, base: string): string {
	return new URL(path, base).pathname;
}
