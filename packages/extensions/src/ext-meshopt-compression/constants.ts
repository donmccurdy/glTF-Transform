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
