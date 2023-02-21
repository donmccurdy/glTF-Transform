import type { Document, Transform } from '@gltf-transform/core';
import { KHRDracoMeshCompression } from '@gltf-transform/extensions';
import { createTransform } from './utils.js';

const NAME = 'draco';

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
 * Applies Draco compression using {@link KHRDracoMeshCompression KHR_draco_mesh_compression}.
 * This type of compression can reduce the size of triangle geometry.
 *
 * This function is a thin wrapper around the {@link KHRDracoMeshCompression} extension itself.
 */
export const draco = (_options: DracoOptions = DRACO_DEFAULTS): Transform => {
	const options = { ...DRACO_DEFAULTS, ..._options } as Required<DracoOptions>;
	return createTransform(NAME, (doc: Document): void => {
		doc.createExtension(KHRDracoMeshCompression)
			.setRequired(true)
			.setEncoderOptions({
				method:
					options.method === 'edgebreaker'
						? KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER
						: KHRDracoMeshCompression.EncoderMethod.SEQUENTIAL,
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
	});
};
