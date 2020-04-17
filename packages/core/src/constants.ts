/**
 * Interface allowing Accessor setter/getter methods to be used interchangeably with gl-matrix
 * arrays or with three.js math objects' fromArray/toArray methods.
 */
export interface ArrayProxy {
	fromArray(array: number[]): ArrayProxy;
	toArray(array: number[]): number[];
}

export type vec2 = [number, number];
export type vec3 = [number, number, number];
export type vec4 = [number, number, number, number];

// TODO(cleanup): Just 'SCALAR' | 'VEC2' | ... would be nicer.
export const AccessorType = {
	SCALAR: 'SCALAR',
	VEC2: 'VEC2',
	VEC3: 'VEC3',
	VEC4: 'VEC4',
	MAT2: 'MAT2',
	MAT3: 'MAT3',
	MAT4: 'MAT4',
}

export const AccessorTypeData = {
	SCALAR: {value: 'SCALAR', size: 1},
	VEC2: {value: 'VEC2', size: 2},
	VEC3: {value: 'VEC3', size: 3},
	VEC4: {value: 'VEC4', size: 4},
	MAT2: {value: 'MAT2', size: 4},
	MAT3: {value: 'MAT3', size: 9},
	MAT4: {value: 'MAT4', size: 16},
};

export const AccessorComponentType = {
	BYTE: 5120,
	UNSIGNED_BYTE: 5121,
	SHORT: 5122,
	UNSIGNED_SHORT: 5123,
	UNSIGNED_INT: 5125,
	FLOAT: 5126,
};

export const AccessorComponentTypeData = {
	'5120': {value: 'BYTE', size: 1 },
	'5121': {value: 'UNSIGNED_BYTE', size: 1 },
	'5122': {value: 'SHORT', size: 2 },
	'5123': {value: 'UNSIGNED_SHORT', size: 2 },
	'5125': {value: 'UNSIGNED_INT', size: 4 },
	'5126': {value: 'FLOAT', size: 4 },
};

export const ComponentTypeToTypedArray = {
	'5120': Int8Array,
	'5121': Uint8Array,
	'5122': Int16Array,
	'5123': Uint16Array,
	'5125': Uint32Array,
	'5126': Float32Array,
};

export const BufferViewTarget = {
	ARRAY_BUFFER: 34962,
	ELEMENT_ARRAY_BUFFER: 34963
};

export const GLB_BUFFER = '__glb.bin';

export type TypedArray = Float32Array | Uint32Array | Uint16Array | Uint8Array | Int16Array | Int8Array;

export const NOT_IMPLEMENTED = new Error('Not implemented.');
