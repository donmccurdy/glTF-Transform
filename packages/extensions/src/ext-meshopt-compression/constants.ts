import type { GLTF, TypedArray } from '@gltf-transform/core';

export enum EncoderMethod {
	QUANTIZE = 'quantize',
	FILTER = 'filter',
}

export interface MeshoptBufferExtension {
	fallback?: boolean;
}

export enum MeshoptMode {
	ATTRIBUTES = 'ATTRIBUTES',
	TRIANGLES = 'TRIANGLES',
	INDICES = 'INDICES',
}

export enum MeshoptFilter {
	NONE = 'NONE',
	OCTAHEDRAL = 'OCTAHEDRAL',
	QUATERNION = 'QUATERNION',
	EXPONENTIAL = 'EXPONENTIAL',
}

export interface MeshoptBufferViewExtension {
	buffer: number;
	byteOffset: number;
	byteLength: number;
	byteStride: number;
	count: number;
	mode: MeshoptMode;
	filter?: MeshoptFilter;
}

/**
 * When using filters, the accessor definition written to the file will not necessarily have the
 * same properties as the input accessor. For example, octahedral encoding requires int8 or int16
 * output, so float32 input must be ignored.
 */
export interface PreparedAccessor {
	array: TypedArray;
	byteStride: number;
	normalized: boolean;
	componentType: GLTF.AccessorComponentType;
	min?: number[];
	max?: number[];
}
