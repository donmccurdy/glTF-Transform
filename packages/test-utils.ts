import { DenoIO, PlatformIO, WebIO, NodeIO } from '@gltf-transform/core';
import test from 'tape';

export enum Environment {
	WEB,
	DENO,
	NODE,
}

export const environment =
	typeof window !== 'undefined' ? Environment.WEB : typeof Deno !== 'undefined' ? Environment.DENO : Environment.NODE;

export const createPlatformIO = async (): Promise<PlatformIO> => {
	switch (environment) {
		case Environment.WEB:
			return new WebIO();
		case Environment.DENO:
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			return new DenoIO(await import('https://deno.land/std/path/mod.ts'));
		case Environment.NODE:
			return new NodeIO();
	}
};

export const throwsAsync = async (t: test.Test, fn: () => Promise<unknown>, re: RegExp, msg: string): Promise<void> => {
	try {
		await fn();
		t.fail(msg);
	} catch (e) {
		t.match((e as Error).message, re, msg);
	}
};
