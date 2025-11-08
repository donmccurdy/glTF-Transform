import type { Ref, RefList, RefMap, RefSet } from 'property-graph';
import type { Property } from '../properties/property.js';
import { BufferUtils } from './buffer-utils.js';

// Utilities for computing fast, non-cryptographic hashes on various property
// types. Built for use in {@link Property.toHash}. Note that hashes on
// identical inputs are guaranteed to match, but non-matching inputs may
// result in occasional hash collisions. Use {@link Property.equals} to
// confirm equality.
//
// TODO(perf): Hashes should be computed without heap allocations.
// TODO(test): Verify that combining hashes with XOR is safe.

export function hashRef(value: Ref<Property>, skip: Set<string>, cache: Map<Property, number>): number {
	return value.getChild().toHash(skip, cache);
}

export function hashRefSet(
	value: RefSet<Property> | RefList<Property>,
	skip: Set<string>,
	cache: Map<Property, number>,
): number {
	let hash = 0;
	for (const ref of value.values()) {
		hash ^= ref.getChild().toHash(skip, cache);
	}
	return hash;
}

export function hashRefMap(value: RefMap<Property>, skip: Set<string>, cache: Map<Property, number>): number {
	let hash = 0;
	for (const key of value.keys()) {
		const ref = value.get(key);
		if (ref) {
			hash ^= hashString(key);
			hash ^= ref.getChild().toHash(skip, cache);
		}
	}
	return hash;
}

export function hashString(value: string): number {
	return _hashBytes(BufferUtils.encodeText(value));
}

export function hashNumber(value: number): number {
	return hashArrayBufferView(new Float64Array([value]));
}

export function hashBoolean(value: boolean): number {
	return hashNumber(Number(value));
}

export function hashObject(value: object): number {
	return hashString(JSON.stringify(value));
}

export function hashArray(value: unknown[]): number {
	return hashString(JSON.stringify(value));
}

export function hashArrayBufferView(value: ArrayBufferView): number {
	return _hashBytes(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
}

function _hashBytes(value: Uint8Array): number {
	const bytes = BufferUtils.pad(value);
	const bytesU32 = new Uint32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / Uint32Array.BYTES_PER_ELEMENT);
	return murmurHash2(0, bytesU32);
}

/**
 * References:
 * - https://github.com/mikolalysenko/murmurhash-js/blob/f19136e9f9c17f8cddc216ca3d44ec7c5c502f60/murmurhash2_gc.js#L14
 * - https://github.com/zeux/meshoptimizer/blob/e47e1be6d3d9513153188216455bdbed40a206ef/src/indexgenerator.cpp#L12
 */
function murmurHash2(h: number, key: Uint32Array): number {
	const m = 0x5bd1e995;
	const r = 24;

	for (let i = 0, il = key.length; i < il; i++) {
		let k = key[i];

		k = Math.imul(k, m) >>> 0;
		k = (k ^ (k >> r)) >>> 0;
		k = Math.imul(k, m) >>> 0;

		h = Math.imul(h, m) >>> 0;
		h = (h ^ k) >>> 0;
	}

	return h;
}
