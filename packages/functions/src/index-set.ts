/**
 * Implements a {@link Set} for maintaining a collection of integer indices,
 * with minimal performance and memory overhead over multiple passes.
 */
export class IndexSet {
	private readonly _array: Uint32Array;
	private _clearCount = 0;
	private readonly _clearLimit: number;

	constructor(array: Uint32Array) {
		this._array = array;
		this._clearLimit = Math.pow(2, array.BYTES_PER_ELEMENT * 8) - 1;
	}

	/** Returns true if the given index exists in the collection. */
	public has(index: number): boolean {
		return this._array[index] > this._clearCount;
	}

	/** Adds the given index to the collection. */
	public add(index: number) {
		this._array[index] = this._clearCount + 1;
	}

	/** Clears all indices added in the most recent pass. */
	public clear(): void {
		this._clearCount++;

		if (this._clearCount > this._clearLimit) {
			throw new Error('IndexMask size limit exceeded.');
		}
	}
}
