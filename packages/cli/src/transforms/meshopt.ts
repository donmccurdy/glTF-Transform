import { Document, Transform } from '@gltf-transform/core';
import { MeshoptCompression } from '@gltf-transform/extensions';
import { reorder, quantize } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

export interface MeshoptCLIOptions {
	method?: 'c' | 'cc'
}

export const MESHOPT_DEFAULTS: Required<MeshoptCLIOptions> = {
	method: 'cc'
};

export const meshopt = (_options: MeshoptCLIOptions): Transform => {
	const options = {...MESHOPT_DEFAULTS, ..._options} as Required<MeshoptCLIOptions>;
	return async (document: Document): Promise<void> => {

		await document.transform(
			reorder({
				encoder: MeshoptEncoder,
				target: 'size'
			}),
		);

		if (options.method === 'c') {
			await document.transform(
				quantize({
					quantizePosition: 14,
					quantizeTexcoord: 12,
					quantizeColor: 8,
					quantizeNormal: 8
				}),
			);
		}

		document.createExtension(MeshoptCompression)
			.setRequired(true)
			.setEncoderOptions({
				method: options.method === 'c'
					? MeshoptCompression.EncoderMethod.QUANTIZE
					: MeshoptCompression.EncoderMethod.FILTER
			});
	};
};
