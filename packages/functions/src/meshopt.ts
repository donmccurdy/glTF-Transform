import type { Document, Transform } from '@gltf-transform/core';
import { MeshoptCompression } from '@gltf-transform/extensions';
import type { MeshoptEncoder } from 'meshoptimizer';
import { reorder } from './reorder';
import { quantize } from './quantize';

export interface MeshoptOptions {
	encoder: typeof MeshoptEncoder;
	level?: 'medium' | 'high';
}

export const MESHOPT_DEFAULTS: Required<Omit<MeshoptOptions, 'encoder'>> = { level: 'high' };

const NAME = 'meshopt';

/**
 * Applies Meshopt compression using {@link MeshoptCompression EXT_meshopt_compression}.
 * This type of compression can reduce the size of point, line, and triangle geometry,
 * morph targets, and animation data.
 *
 * This function is a thin wrapper around {@link reorder}, {@link quantize}, and
 * {@link MeshoptCompression}, and exposes relatively few configuration options.
 * To access more options (like quantization bits) direct use of the underlying
 * functions is recommended.
 *
 * Example:
 *
 * ```javascript
 * import { MeshoptEncoder } from 'meshoptimizer';
 * import { reorder } from '@gltf-transform/functions';
 *
 * await MeshoptEncoder.ready;
 *
 * await document.transform(
 *   reorder({encoder: MeshoptEncoder, level: 'medium'})
 * );
 * ```
 */
export const meshopt = (_options: MeshoptOptions): Transform => {
	const options = { ...MESHOPT_DEFAULTS, ..._options } as Required<MeshoptOptions>;
	const encoder = options.encoder;

	if (!encoder) {
		throw new Error(`${NAME}: encoder dependency required — install "meshoptimizer".`);
	}

	return async (document: Document): Promise<void> => {
		await document.transform(
			reorder({
				encoder: encoder,
				target: 'size',
			}),
			quantize({
				// IMPORTANT: Vertex attributes should be quantized in 'high' mode IFF they are
				// _not_ filtered in 'packages/extensions/src/ext-meshopt-compression/encoder.ts'.
				pattern: options.level === 'medium' ? /.*/ : /^(POSITION|TEXCOORD|JOINTS|WEIGHTS)(_\d+)?$/,
				quantizePosition: 14,
				quantizeTexcoord: 12,
				quantizeColor: 8,
				quantizeNormal: 8,
			})
		);

		document
			.createExtension(MeshoptCompression)
			.setRequired(true)
			.setEncoderOptions({
				method:
					options.level === 'medium'
						? MeshoptCompression.EncoderMethod.QUANTIZE
						: MeshoptCompression.EncoderMethod.FILTER,
			});
	};
};
