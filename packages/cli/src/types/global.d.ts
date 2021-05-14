// See: https://github.com/KhronosGroup/glTF-Validator/issues/114
declare module 'gltf-validator';

declare module 'geo-ambient-occlusion' {
	import REGL from 'regl';

	type TypedArray = Float32Array
		| Uint32Array
		| Uint16Array
		| Uint8Array
		| Int16Array
		| Int8Array;

	interface AmbientOcclusionOptions {
		cells?: TypedArray | null,
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
