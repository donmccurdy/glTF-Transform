import type { Document, Transform } from '@gltf-transform/core';
import { DracoMeshCompression } from '@gltf-transform/extensions';

export interface DracoOptions {
	method?: 'edgebreaker' | 'sequential';
	encodeSpeed?: number;
	decodeSpeed?: number;
	quantizePosition?: number;
	quantizeNormal?: number;
	quantizeColor?: number;
	quantizeTexcoord?: number;
	quantizeGeneric?: number;
	quantizationVolume?: 'mesh' | 'scene';
}

export const DRACO_DEFAULTS: DracoOptions = {
	method: 'edgebreaker',
	encodeSpeed: 5,
	decodeSpeed: 5,
	quantizePosition: 14,
	quantizeNormal: 10,
	quantizeColor: 8,
	quantizeTexcoord: 12,
	quantizeGeneric: 12,
	quantizationVolume: 'mesh',
};

/**
 * Applies Draco compression using {@link DracoMeshCompression KHR_draco_mesh_compression}.
 * This type of compression can reduce the size of triangle geometry.
 *
 * This function is a thin wrapper around the {@link DracoMeshCompression} extension itself.
 */
export const draco = (_options: DracoOptions): Transform => {
	const options = { ...DRACO_DEFAULTS, ..._options } as Required<DracoOptions>;
	return (doc: Document): void => {
		doc.createExtension(DracoMeshCompression)
			.setRequired(true)
			.setEncoderOptions({
				method:
					options.method === 'edgebreaker'
						? DracoMeshCompression.EncoderMethod.EDGEBREAKER
						: DracoMeshCompression.EncoderMethod.SEQUENTIAL,
				encodeSpeed: options.encodeSpeed,
				decodeSpeed: options.decodeSpeed,
				quantizationBits: {
					POSITION: options.quantizePosition,
					NORMAL: options.quantizeNormal,
					COLOR: options.quantizeColor,
					TEX_COORD: options.quantizeTexcoord,
					GENERIC: options.quantizeGeneric,
				},
				quantizationVolume: options.quantizationVolume,
			});
	};
};
