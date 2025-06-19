import { type Accessor, BufferUtils, type Primitive } from '@gltf-transform/core';
import { deepListAttributes } from './utils.js';

/** Flags 'empty' values in a Uint32Array index. */
export const EMPTY_U32: number = 2 ** 32 - 1;

export class VertexStream {
	private attributes: { u8: Uint8Array; byteStride: number; paddedByteStride: number }[] = [];

	/** Temporary vertex views in 4-byte-aligned memory. */
	private u8: Uint8Array;
	private u32: Uint32Array;

	constructor(prim: Primitive) {
		let byteStride = 0;
		for (const attribute of deepListAttributes(prim)) {
			byteStride += this._initAttribute(attribute);
		}
		this.u8 = new Uint8Array(byteStride);
		this.u32 = new Uint32Array(this.u8.buffer);
	}

	private _initAttribute(attribute: Accessor): number {
		const array = attribute.getArray()!;
		const u8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
		const byteStride = attribute.getElementSize() * attribute.getComponentSize();
		const paddedByteStride = BufferUtils.padNumber(byteStride);
		this.attributes.push({ u8, byteStride, paddedByteStride });
		return paddedByteStride;
	}

	hash(index: number): number {
		// Load vertex into 4-byte-aligned view.
		let byteOffset = 0;
		for (const { u8, byteStride, paddedByteStride } of this.attributes) {
			for (let i = 0; i < paddedByteStride; i++) {
				if (i < byteStride) {
					this.u8[byteOffset + i] = u8[index * byteStride + i];
				} else {
					this.u8[byteOffset + i] = 0;
				}
			}
			byteOffset += paddedByteStride;
		}

		// Compute hash.
		return murmurHash2(0, this.u32);
	}

	equal(a: number, b: number): boolean {
		for (const { u8, byteStride } of this.attributes) {
			for (let j = 0; j < byteStride; j++) {
				if (u8[a * byteStride + j] !== u8[b * byteStride + j]) {
					return false;
				}
			}
		}
		return true;
	}
}

/**
 * References:
 * - https://github.com/mikolalysenko/murmurhash-js/blob/f19136e9f9c17f8cddc216ca3d44ec7c5c502f60/murmurhash2_gc.js#L14
 * - https://github.com/zeux/meshoptimizer/blob/e47e1be6d3d9513153188216455bdbed40a206ef/src/indexgenerator.cpp#L12
 */
function murmurHash2(h: number, key: Uint32Array): number {
	// MurmurHash2
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

export function hashLookup(
	table: Uint32Array,
	buckets: number,
	stream: VertexStream,
	key: number,
	empty: number = EMPTY_U32,
): number {
	const hashmod = buckets - 1;
	const hashval = stream.hash(key);
	let bucket = hashval & hashmod;

	for (let probe = 0; probe <= hashmod; probe++) {
		const item = table[bucket];

		if (item === empty || stream.equal(item, key)) {
			return bucket;
		}

		bucket = (bucket + probe + 1) & hashmod; // Hash collision.
	}

	throw new Error('Hash table full.');
}
