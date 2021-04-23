import { Document, Transform } from '@gltf-transform/core';
import { DracoMeshCompression } from '@gltf-transform/extensions';

export interface DracoCLIOptions {
	method?: 'edgebreaker' | 'sequential';
	encodeSpeed?: number;
	decodeSpeed?: number;
	quantizePosition?: number;
	quantizeNormal?: number;
	quantizeColor?: number;
	quantizeTexcoord?: number;
	quantizeGeneric?: number;
}

export const DRACO_DEFAULTS: DracoCLIOptions = {
	method: 'edgebreaker',
	encodeSpeed: 5,
	decodeSpeed: 5,
	quantizePosition: 14,
	quantizeNormal: 10,
	quantizeColor: 8,
	quantizeTexcoord: 12,
	quantizeGeneric: 12,
};

export const draco = (options: DracoCLIOptions): Transform => {
	return (doc: Document): void => {
		doc.createExtension(DracoMeshCompression)
			.setRequired(true)
			.setEncoderOptions({
				method: options.method === 'edgebreaker'
					? DracoMeshCompression.EncoderMethod.EDGEBREAKER
					: DracoMeshCompression.EncoderMethod.SEQUENTIAL,
				encodeSpeed: options.encodeSpeed,
				decodeSpeed: options.decodeSpeed,
				quantizationBits: {
					'POSITION': options.quantizePosition,
					'NORMAL': options.quantizeNormal,
					'COLOR': options.quantizeColor,
					'TEX_COORD': options.quantizeTexcoord,
					'GENERIC': options.quantizeGeneric,
				}
			});
	};
};
