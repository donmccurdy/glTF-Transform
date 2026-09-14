import { type vec3 as _vec3, type bbox, DenoIO, Logger, NodeIO, type PlatformIO, WebIO } from '@gltf-transform/core';

export enum Environment {
	WEB = 'web',
	DENO = 'deno',
	NODE = 'node',
}

export const environment: Environment = (() => {
	if (typeof window !== 'undefined') return Environment.WEB;
	if (typeof Deno !== 'undefined') return Environment.DENO;
	if (typeof process !== 'undefined') return Environment.NODE;
	throw new Error('Unknown test environment');
})();

export const logger: Logger = new Logger(Logger.Verbosity.SILENT);

// TODO(deno): DenoIO?
export const createPlatformIO = async (): Promise<PlatformIO> => {
	switch (environment) {
		case Environment.WEB:
			return new WebIO().setLogger(logger);
		case Environment.DENO:
			return new DenoIO().setLogger(logger);
		case Environment.NODE:
			return new NodeIO().setLogger(logger);
	}
};

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

import * as mat3 from 'gl-matrix/mat3';
// bundle and re-export these, because the tests can't import them directly.
// https://github.com/toji/gl-matrix/issues/444
import * as mat4 from 'gl-matrix/mat4';
import * as quat from 'gl-matrix/quat';
import * as vec2 from 'gl-matrix/vec2';
import * as vec3 from 'gl-matrix/vec3';
import * as vec4 from 'gl-matrix/vec4';

export * from './create-basic-primitive.js';
export * from './create-torus-primitive.js';
export { mat3, mat4, quat, vec2, vec3, vec4 };
