import type { Document, Transform } from '@gltf-transform/core';
import { EXTMeshoptCompression } from '@gltf-transform/extensions';
import type { MeshoptEncoder } from 'meshoptimizer';
import { QUANTIZE_DEFAULTS, type QuantizeOptions, quantize } from './quantize.js';
import { reorder } from './reorder.js';
import { assignDefaults, createTransform } from './utils.js';

export interface MeshoptOptions extends Omit<QuantizeOptions, 'pattern' | 'patternTargets'> {
	encoder: unknown;
	level?: 'medium' | 'high';
}

export const MESHOPT_DEFAULTS: Required<Omit<MeshoptOptions, 'encoder'>> = {
	level: 'high',
	...QUANTIZE_DEFAULTS,
};

const NAME = 'meshopt';

/**
 * Applies Meshopt compression using {@link EXTMeshoptCompression EXT_meshopt_compression}.
 * This type of compression can reduce the size of point, line, and triangle geometry,
 * morph targets, and animation data.
 *
 * This function is a thin wrapper around {@link reorder}, {@link quantize}, and
 * {@link EXTMeshoptCompression}, and exposes relatively few configuration options.
 * To access more options (like quantization bits) direct use of the underlying
 * functions is recommended.
 *
 * Example:
 *
 * ```javascript
 * import { MeshoptEncoder } from 'meshoptimizer';
 * import { meshopt } from '@gltf-transform/functions';
 *
 * await MeshoptEncoder.ready;
 *
 * await document.transform(
 *   meshopt({encoder: MeshoptEncoder, level: 'medium'})
 * );
 * ```
 *
 * Compression is deferred until generating output with an I/O class.
 *
 * @category Transforms
 */
export function meshopt(_options: MeshoptOptions): Transform {
	const options = assignDefaults(MESHOPT_DEFAULTS, _options);
	const encoder = options.encoder as typeof MeshoptEncoder | undefined;

	if (!encoder) {
		throw new Error(`${NAME}: encoder dependency required — install "meshoptimizer".`);
	}

	return createTransform(NAME, async (document: Document): Promise<void> => {
		let pattern: RegExp;
		let patternTargets: RegExp;
		let quantizeNormal = options.quantizeNormal;

		if (document.getRoot().listAccessors().length === 0) {
			return;
		}

		// IMPORTANT: Vertex attributes should be quantized in 'high' mode IFF they are
		// _not_ filtered in 'packages/extensions/src/ext-meshopt-compression/encoder.ts'.
		// Note that normals and tangents use octahedral filters, but _morph_ normals
		// and tangents do not.
		// See: https://github.com/donmccurdy/glTF-Transform/issues/1142
		if (options.level === 'medium') {
			pattern = /.*/;
			patternTargets = /.*/;
		} else {
			pattern = /^(POSITION|TEXCOORD|JOINTS|WEIGHTS|COLOR)(_\d+)?$/;
			patternTargets = /^(POSITION|TEXCOORD|JOINTS|WEIGHTS|COLOR|NORMAL|TANGENT)(_\d+)?$/;
			quantizeNormal = Math.min(quantizeNormal, 8); // See meshopt::getMeshoptFilter.
		}

		await document.transform(
			reorder({
				encoder: encoder,
				target: 'size',
			}),
			quantize({
				...options,
				pattern,
				patternTargets,
				quantizeNormal,
			}),
		);

		document
			.createExtension(EXTMeshoptCompression)
			.setRequired(true)
			.setEncoderOptions({
				method:
					options.level === 'medium'
						? EXTMeshoptCompression.EncoderMethod.QUANTIZE
						: EXTMeshoptCompression.EncoderMethod.FILTER,
			});
	});
}
