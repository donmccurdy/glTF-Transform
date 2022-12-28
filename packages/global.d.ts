/**
 * Global internal type definitions.
 *
 * Definitions provided here cannot be used in public APIs, as they aren't
 * bundled with the published packages. declaring an interface that depends on
 * them will yield, "Property 'X' of exported interface has or is using private
 * name 'Y'.ts(4033)".
 */

/** GL Matrix */

// See: https://github.com/toji/gl-matrix/issues/423

declare module 'gl-matrix/vec4' {
	import { vec4 } from 'gl-matrix';
	export = vec4;
}

declare module 'gl-matrix/vec3' {
	import { vec3 } from 'gl-matrix';
	export = vec3;
}

declare module 'gl-matrix/vec2' {
	import { vec2 } from 'gl-matrix';
	export = vec2;
}

declare module 'gl-matrix/mat4' {
	import { mat4 } from 'gl-matrix';
	export = mat4;
}

declare module 'gl-matrix/mat3' {
	import { mat3 } from 'gl-matrix';
	export = mat3;
}

declare module 'gl-matrix/quat' {
	import { quat } from 'gl-matrix';
	export = quat;
}

declare module 'gl-matrix/quat2' {
	import { quat2 } from 'gl-matrix';
	export = quat2;
}

/** Deno */

declare const Deno: {
	readFile: (path: string) => Promise<Uint8Array>;
	readTextFile: (path: string) => Promise<string>;
};
