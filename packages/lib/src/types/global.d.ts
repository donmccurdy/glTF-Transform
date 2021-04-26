declare module 'geo-ambient-occlusion' {
	import REGL from 'regl';

	type TypedArray = Float32Array
		| Uint32Array
		| Uint16Array
		| Uint8Array
		| Int16Array
		| Int8Array;

	interface AmbientOcclusionOptions {
		cells?: TypedArray,
		resolution?: number,
		regl?: REGL.Regl,
	}

	class AmbientOcclusionSampler {
		public report(): Float32Array;
		public sample(): void;
		public dispose(): void;
	}

	export default function ambientOcclusion(
		positions: TypedArray,
		options?: AmbientOcclusionOptions
	): AmbientOcclusionSampler;
}

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
