import { BufferUtils, type Property } from '@gltf-transform/core';
import { $attributes, GraphEdge, type Literal, type Ref, RefList, RefMap, RefSet } from 'property-graph';
import { murmurHash2 } from './utils/hash-utils.js';
import { isPlainObject } from './utils/object-utils.js';

const EMPTY_SET = new Set<string>();

// Utilities for fast, non-cryptographic hashes on various types. Built for {@link Property.toHash}.
// Deeply-equal inputs will always produce the same hash, but differing inputs may result in rare
// hash collisions. Use {@link Property.equals} to confirm equality.
//
// TODO(perf): Hashes should be computed without heap allocations.
// TODO(test): Verify that combining hashes with XOR is safe.

/** @experimental */
export type HashPropertyOptions = {
	skip?: Set<string>;
	cache?: Map<Property, number>;
	depth?: number;
};

/**
 * Returns a hash computed from all attributes and references held by this property,
 * excluding the 'skip' set. Hash collisions are rare, but possible: equal hashes
 * do not imply property equality.
 *
 * ```typescript
 * // Properties cannot be equal if hash values differ.
 * if (hashProperty(a) !== hashProperty(b)) {
 *   return false;
 * }
 *
 * // If hash values match, confirm equality.
 * return a.equals(b);
 * ```
 *
 * To reduce the cost of deep traversal when hashing many properties (which may
 * share resources like textures and accessors), reuse a 'cache' parameter across
 * calls. If properties are modified, the cache should be cleared.
 *
 * @experimental
 */
export function hashProperty(prop: Property, options?: HashPropertyOptions): number {
	const skip = options?.skip ?? EMPTY_SET;
	const cache = options?.cache ?? new Map();
	const depth = options?.depth ?? 1;

	if (cache.has(prop)) return cache.get(prop)!;

	let hash = hashString(prop.propertyType);

	for (const key in prop[$attributes]) {
		if (skip.has(key)) continue;

		// @ts-expect-error
		const value = prop[$attributes][key] as UnknownRef | Literal;

		if (value instanceof GraphEdge) {
			hash ^= hashRef(value, skip, cache, depth);
		} else if (value instanceof RefSet || value instanceof RefList) {
			hash ^= hashRefSet(value, skip, cache, depth);
		} else if (value instanceof RefMap) {
			hash ^= hashRefMap(value, skip, cache, depth);
		} else if (isPlainObject(value)) {
			hash ^= hashObject(value);
		} else if (Array.isArray(value)) {
			hash ^= hashArray(value);
		} else if (typeof value === 'string') {
			hash ^= hashString(value);
		} else if (typeof value === 'boolean') {
			hash ^= hashBoolean(value);
		} else if (typeof value === 'number') {
			hash ^= hashNumber(value);
		} else if (ArrayBuffer.isView(value)) {
			hash ^= hashView(value);
		} else {
			hash ^= hashString(String(value));
		}
	}

	cache.set(prop, hash);
	return hash;
}

function hashRef(value: Ref<Property>, skip: Set<string>, cache: Map<Property, number>, depth: number): number {
	const hashOptions = { skip, cache, depth: depth - 1 };
	return depth > 0 ? hashProperty(value.getChild(), hashOptions) : value.getChild().__id;
}

function hashRefSet(
	value: RefSet<Property> | RefList<Property>,
	skip: Set<string>,
	cache: Map<Property, number>,
	depth: number,
): number {
	const hashOptions = { skip, cache, depth: depth - 1 };
	let hash = 0;
	for (const ref of value.values()) {
		hash ^= depth > 0 ? hashProperty(ref.getChild(), hashOptions) : ref.getChild().__id;
	}
	return hash;
}

function hashRefMap(value: RefMap<Property>, skip: Set<string>, cache: Map<Property, number>, depth: number): number {
	const hashOptions = { skip, cache, depth: depth - 1 };
	let hash = 0;
	for (const key of value.keys()) {
		const ref = value.get(key);
		if (ref) {
			hash ^= hashString(key);
			hash ^= depth > 0 ? hashProperty(ref.getChild(), hashOptions) : ref.getChild().__id;
		}
	}
	return hash;
}

function hashString(value: string): number {
	return _hashBytes(BufferUtils.encodeText(value));
}

function hashNumber(value: number): number {
	return hashView(new Float64Array([value]));
}

function hashBoolean(value: boolean): number {
	return hashNumber(Number(value));
}

function hashObject(value: object): number {
	return hashString(JSON.stringify(value));
}

function hashArray(value: unknown[]): number {
	return hashString(JSON.stringify(value));
}

function hashView(value: ArrayBufferView): number {
	return _hashBytes(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
}

function _hashBytes(value: Uint8Array): number {
	const bytes = BufferUtils.pad(value);
	const bytesU32 = new Uint32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / Uint32Array.BYTES_PER_ELEMENT);
	return murmurHash2(0, bytesU32);
}
