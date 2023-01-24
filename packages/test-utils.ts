import { DenoIO, PlatformIO, WebIO, NodeIO, Logger } from '@gltf-transform/core';

export enum Environment {
	WEB,
	DENO,
	NODE,
}

export const environment = (typeof window !== 'undefined' ? Environment.WEB : Environment.NODE) as Environment;

const logger = new Logger(Logger.Verbosity.SILENT);

export const createPlatformIO = async (): Promise<PlatformIO> => {
	switch (environment) {
		case Environment.WEB:
			return new WebIO().setLogger(logger);
		case Environment.DENO:
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			return new DenoIO(await import('https://deno.land/std/path/mod.ts')).setLogger(logger);
		case Environment.NODE:
			return new NodeIO().setLogger(logger);
	}
};
