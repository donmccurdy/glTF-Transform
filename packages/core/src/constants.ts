// Injected at compile time, from $npm_package_version.
declare const PACKAGE_VERSION: string;

/**
 * Current version of the package.
 * @hidden
 */
export const VERSION: string = `v${PACKAGE_VERSION}`;

/** @internal */
export const NAME = '@gltf-transform/core';

/**
 * Interface allowing Accessor setter/getter methods to be used interchangeably with gl-matrix
 * arrays or with three.js math objects' fromArray/toArray methods. For example, THREE.Vector2,
 * THREE.Vector3, THREE.Vector4, THREE.Quaternion, THREE.Matrix3, THREE.Matrix4, and THREE.Color.
 *
 * @internal
 */
export interface ArrayProxy {
	/** Sets the value of the object from an array of values. */
	fromArray(array: number[]): ArrayProxy;
	/** Writes the value of the object into the given array. */
	toArray(array: number[]): number[];
}

/**
 * TypeScript utility for nullable types.
 * @hidden
 */
export type Nullable<T> = { [P in keyof T]: T[P] | null };

/**
 * 2-dimensional vector.
 * @hidden
 */
export type vec2 = [number, number];

/**
 * 3-dimensional vector.
 * @hidden
 */
export type vec3 = [number, number, number];

/**
 * 4-dimensional vector, e.g. RGBA or a quaternion.
 * @hidden
 */
export type vec4 = [number, number, number, number];

// biome-ignore format: Readability.
/**
 * 3x3 matrix, e.g. an affine transform of a 2D vector.
 * @hidden
 */
export type mat3 = [
	number, number, number,
	number, number, number,
	number, number, number,
];

// biome-ignore format: Readability.
/**
 * 4x4 matrix, e.g. an affine transform of a 3D vector.
 * @hidden
 */
export type mat4 = [
	number, number, number, number,
	number, number, number, number,
	number, number, number, number,
	number, number, number, number,
];

/** @hidden */
export type bbox = { min: vec3; max: vec3 };

/** @hidden */
export const GLB_BUFFER = '@glb.bin';

/**
 * Abstraction representing any one of the typed array classes supported by glTF and JavaScript.
 * @hidden
 */
export type TypedArray = Float32Array | Uint32Array | Uint16Array | Uint8Array | Int16Array | Int8Array;

/**
 * Abstraction representing the typed array constructors supported by glTF and JavaScript.
 * @hidden
 */
export type TypedArrayConstructor =
	| Float32ArrayConstructor
	| Uint32ArrayConstructor
	| Uint16ArrayConstructor
	| Uint8ArrayConstructor
	| Int16ArrayConstructor
	| Int8ArrayConstructor;

/** String IDs for core {@link Property} types. */
export enum PropertyType {
	ACCESSOR = 'Accessor',
	ANIMATION = 'Animation',
	ANIMATION_CHANNEL = 'AnimationChannel',
	ANIMATION_SAMPLER = 'AnimationSampler',
	BUFFER = 'Buffer',
	CAMERA = 'Camera',
	MATERIAL = 'Material',
	MESH = 'Mesh',
	PRIMITIVE = 'Primitive',
	PRIMITIVE_TARGET = 'PrimitiveTarget',
	NODE = 'Node',
	ROOT = 'Root',
	SCENE = 'Scene',
	SKIN = 'Skin',
	TEXTURE = 'Texture',
	TEXTURE_INFO = 'TextureInfo',
}

/** Vertex layout method. */
export enum VertexLayout {
	/**
	 * Stores vertex attributes in a single buffer view per mesh primitive. Interleaving vertex
	 * data may improve performance by reducing page-thrashing in GPU memory.
	 */
	INTERLEAVED = 'interleaved',

	/**
	 * Stores each vertex attribute in a separate buffer view. May decrease performance by causing
	 * page-thrashing in GPU memory. Some 3D engines may prefer this layout, e.g. for simplicity.
	 */
	SEPARATE = 'separate',
}

/** Accessor usage. */
export enum BufferViewUsage {
	ARRAY_BUFFER = 'ARRAY_BUFFER',
	ELEMENT_ARRAY_BUFFER = 'ELEMENT_ARRAY_BUFFER',
	INVERSE_BIND_MATRICES = 'INVERSE_BIND_MATRICES',
	OTHER = 'OTHER',
	SPARSE = 'SPARSE',
}

/** Texture channels. */
export enum TextureChannel {
	R = 0x1000,
	G = 0x0100,
	B = 0x0010,
	A = 0x0001,
}

export enum Format {
	GLTF = 'GLTF',
	GLB = 'GLB',
}

export const ComponentTypeToTypedArray: Record<string, TypedArrayConstructor> = {
	'5120': Int8Array,
	'5121': Uint8Array,
	'5122': Int16Array,
	'5123': Uint16Array,
	'5125': Uint32Array,
	'5126': Float32Array,
};
