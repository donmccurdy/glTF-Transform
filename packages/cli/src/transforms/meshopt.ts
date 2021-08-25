import { Document, Transform } from '@gltf-transform/core';
import { MeshoptCompression } from '@gltf-transform/extensions';
import { reorder, quantize } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

export interface MeshoptCLIOptions {
	method?: typeof MeshoptCompression.EncoderMethod.QUANTIZE
		| typeof MeshoptCompression.EncoderMethod.FILTER;
}

export const MESHOPT_DEFAULTS: Required<MeshoptCLIOptions> = {
	method: MeshoptCompression.EncoderMethod.QUANTIZE,
};

export const meshopt = (_options: MeshoptCLIOptions): Transform => {
	return async (document: Document): Promise<void> => {

		await document.transform(
			reorder({
				encoder: MeshoptEncoder,
				target: 'size'
			}),
			quantize({
				quantizePosition: 14,
				quantizeTexcoord: 12,
				quantizeColor: 8,
				quantizeNormal: 8
			}),
		);

		document.createExtension(MeshoptCompression)
			.setRequired(true)
			.setEncoderOptions({method: MeshoptCompression.EncoderMethod.QUANTIZE});
	};
};
