/**
 * References:
 * - https://github.com/mikolalysenko/murmurhash-js/blob/f19136e9f9c17f8cddc216ca3d44ec7c5c502f60/murmurhash2_gc.js#L14
 * - https://github.com/zeux/meshoptimizer/blob/e47e1be6d3d9513153188216455bdbed40a206ef/src/indexgenerator.cpp#L12
 */
export function murmurHash2(h: number, key: Uint32Array): number {
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
