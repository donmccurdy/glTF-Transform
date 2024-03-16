import { PlatformIO, WebIO, NodeIO, Logger, bbox, vec3 as _vec3 } from '@gltf-transform/core';

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

/** Creates a rounding function for given decimal precision. */
export function round(decimals = 4): (v: number) => number {
	const f = Math.pow(10, decimals);
	return (v: number) => {
		v = Math.round(v * f) / f;
		v = Object.is(v, -0) ? 0 : v;
		return v;
	};
}

/** Rounds a 3D bounding box to given decimal precision. */
export function roundBbox(bbox: bbox, decimals = 4): bbox {
	return {
		min: bbox.min.map(round(decimals)) as _vec3,
		max: bbox.max.map(round(decimals)) as _vec3,
	};
}

// bundle and re-export these, because the tests can't import them directly.
// https://github.com/toji/gl-matrix/issues/444
import * as mat4 from 'gl-matrix/mat4';
import * as mat3 from 'gl-matrix/mat3';
import * as quat from 'gl-matrix/quat';
import * as vec4 from 'gl-matrix/vec4';
import * as vec3 from 'gl-matrix/vec3';
import * as vec2 from 'gl-matrix/vec2';
export { mat4, mat3, quat, vec4, vec3, vec2 };

export * from './create-basic-primitive.js';
export * from './create-torus-primitive.js';
