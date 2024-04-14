import { Accessor, BufferUtils, Primitive } from '@gltf-transform/core';
import { dequantizeAttributeArray } from './dequantize.js';

/** Flags 'empty' values in a Uint32Array index. */
export const EMPTY_U32 = 2 ** 32 - 1;

export class VertexStream {
	protected prim: Primitive;
	protected vertexByteLength = -1;
	protected attributes: { u8: Uint8Array; byteStride: number; paddedByteStride: number }[] = [];

	/** Temporary vertex views in 4-byte-aligned memory. */
	protected u8: Uint8Array = null!;
	protected u32: Uint32Array = null!;

	constructor(prim: Primitive) {
		this.prim = prim;
	}

	public init(): this {
		const prim = this.prim;

		let vertexByteLength = 0;

		for (const semantic of prim.listSemantics()) {
			const attribute = prim.getAttribute(semantic)!;
			vertexByteLength += this._initAttribute(semantic, attribute);
		}
		for (const target of prim.listTargets()) {
			for (const semantic of target.listSemantics()) {
				const attribute = target.getAttribute(semantic)!;
				vertexByteLength += this._initAttribute(semantic, attribute);
			}
		}

		this.vertexByteLength = vertexByteLength;
		this.u8 = new Uint8Array(vertexByteLength);
		this.u32 = new Uint32Array(this.u8.buffer);
		return this;
	}

	protected _initAttribute(_semantic: string, attribute: Accessor): number {
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

export class QuantizedVertexStream extends VertexStream {
	protected attributeTolerances: Record<string, number>;

	constructor(prim: Primitive, attributeTolerances: Record<string, number>) {
		super(prim);
		this.attributeTolerances = attributeTolerances;
	}

	protected _initAttribute(semantic: string, attribute: Accessor): number {
		// TODO - we're making a complete copy of the attribute just to copy a much smaller
		// number of vertices here, this won't work...
		const tolerance = this.attributeTolerances[semantic];
		const array = dequantizeAttributeArray(
			attribute.getArray()!,
			attribute.getComponentType(),
			attribute.getNormalized(),
		);
		for (let i = 0, il = array.length; i < il; i++) {
			array[i] = Math.round(array[i] / tolerance) * tolerance;
		}
		const u8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
		const byteStride = attribute.getElementSize() * attribute.getComponentSize();
		const paddedByteStride = BufferUtils.padNumber(byteStride);
		this.attributes.push({ u8, byteStride, paddedByteStride });
		return paddedByteStride;
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
	empty = EMPTY_U32,
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
