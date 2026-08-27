/**
 * Global internal type definitions.
 *
 * Definitions provided here cannot be used in public APIs, as they aren't
 * bundled with the published packages. declaring an interface that depends on
 * them will yield, "Property 'X' of exported interface has or is using private
 * name 'Y'.ts(4033)".
 */

interface ImportMetaEnv {
	readonly PACKAGE_VERSION: string;
}

// biome-ignore lint/correctness/noUnusedVariables: Ambient type definition.
interface ImportMeta {
	readonly env: ImportMetaEnv;
}

/** GL Matrix */

// See: https://github.com/toji/gl-matrix/issues/423

declare module 'gl-matrix/vec4' {
	import type { vec4 } from 'gl-matrix';
	export const add: typeof vec4.add;
	export const create: typeof vec4.create;
	export const len: typeof vec4.len;
	export const length: typeof vec4.length;
	export const mul: typeof vec4.mul;
	export const scale: typeof vec4.scale;
	export const sub: typeof vec4.sub;
}

declare module 'gl-matrix/vec3' {
	import type { vec3 } from 'gl-matrix';
	export const create: typeof vec3.create;
	export const length: typeof vec3.length;
	export const min: typeof vec3.min;
	export const max: typeof vec3.max;
	export const mul: typeof vec3.mul;
	export const scale: typeof vec3.scale;
	export const transformMat3: typeof vec3.transformMat3;
	export const transformMat4: typeof vec3.transformMat4;
	export const normalize: typeof vec3.normalize;
}

declare module 'gl-matrix/vec2' {
	import type { vec2 } from 'gl-matrix';
	export const create: typeof vec2.create;
}

declare module 'gl-matrix/mat4' {
	import type { mat4 } from 'gl-matrix';
	export const create: typeof mat4.create;
	export const determinant: typeof mat4.determinant;
	export const invert: typeof mat4.invert;
	export const getRotation: typeof mat4.getRotation;
	export const fromScaling: typeof mat4.fromScaling;
	export const fromRotationTranslationScale: typeof mat4.fromRotationTranslationScale;
	export const multiply: typeof mat4.multiply;
}

declare module 'gl-matrix/mat3' {
	import type { mat3 } from 'gl-matrix';
	export const create: typeof mat3.create;
	export const fromMat4: typeof mat3.fromMat4;
	export const invert: typeof mat3.invert;
	export const transpose: typeof mat3.transpose;
}

declare module 'gl-matrix/quat' {
	import type { quat } from 'gl-matrix';
	export const create: typeof quat.create;
}

declare module 'gl-matrix/quat2' {
	import type { quat2 } from 'gl-matrix';
	export const create: typeof quat2.create;
}

/** Deno */

declare const Deno: {
	readFile: (path: string) => Promise<Uint8Array<ArrayBuffer>>;
	readTextFile: (path: string) => Promise<string>;
};
