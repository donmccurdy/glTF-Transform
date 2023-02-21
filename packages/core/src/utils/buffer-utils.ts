import type { TypedArray } from '../constants.js';

/**
 * # BufferUtils
 *
 * *Common utilities for working with Uint8Array and Buffer objects.*
 *
 * @category Utilities
 */
export class BufferUtils {
	/** Creates a byte array from a Data URI. */
	static createBufferFromDataURI(dataURI: string): Uint8Array {
		if (typeof Buffer === 'undefined') {
			// Browser.
			const byteString = atob(dataURI.split(',')[1]);
			const ia = new Uint8Array(byteString.length);
			for (let i = 0; i < byteString.length; i++) {
				ia[i] = byteString.charCodeAt(i);
			}
			return ia;
		} else {
			// Node.js.
			const data = dataURI.split(',')[1];
			const isBase64 = dataURI.indexOf('base64') >= 0;
			return Buffer.from(data, isBase64 ? 'base64' : 'utf8');
		}
	}

	/** Encodes text to a byte array. */
	static encodeText(text: string): Uint8Array {
		if (typeof TextEncoder !== 'undefined') {
			return new TextEncoder().encode(text);
		}
		return Buffer.from(text);
	}

	/** Decodes a byte array to text. */
	static decodeText(array: Uint8Array): string {
		if (typeof TextDecoder !== 'undefined') {
			return new TextDecoder().decode(array);
		}
		return Buffer.from(array).toString('utf8');
	}

	/**
	 * Concatenates N byte arrays.
	 */
	static concat(arrays: Uint8Array[]): Uint8Array {
		let totalByteLength = 0;
		for (const array of arrays) {
			totalByteLength += array.byteLength;
		}

		const result = new Uint8Array(totalByteLength);
		let byteOffset = 0;

		for (const array of arrays) {
			result.set(array, byteOffset);
			byteOffset += array.byteLength;
		}

		return result;
	}

	/**
	 * Pads a Uint8Array to the next 4-byte boundary.
	 *
	 * Reference: [glTF → Data Alignment](https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#data-alignment)
	 */
	static pad(srcArray: Uint8Array, paddingByte = 0): Uint8Array {
		const paddedLength = this.padNumber(srcArray.byteLength);
		if (paddedLength === srcArray.byteLength) return srcArray;

		const dstArray = new Uint8Array(paddedLength);
		dstArray.set(srcArray);

		if (paddingByte !== 0) {
			for (let i = srcArray.byteLength; i < paddedLength; i++) {
				dstArray[i] = paddingByte;
			}
		}

		return dstArray;
	}

	/** Pads a number to 4-byte boundaries. */
	static padNumber(v: number): number {
		return Math.ceil(v / 4) * 4;
	}

	/** Returns true if given byte array instances are equal. */
	static equals(a: Uint8Array, b: Uint8Array): boolean {
		if (a === b) return true;

		if (a.byteLength !== b.byteLength) return false;

		let i = a.byteLength;
		while (i--) {
			if (a[i] !== b[i]) return false;
		}

		return true;
	}

	/**
	 * Returns a Uint8Array view of a typed array, with the same underlying ArrayBuffer.
	 *
	 * A shorthand for:
	 *
	 * ```js
	 * const buffer = new Uint8Array(
	 * 	array.buffer,
	 * 	array.byteOffset + byteOffset,
	 * 	Math.min(array.byteLength, byteLength)
	 * );
	 * ```
	 *
	 */
	static toView(a: TypedArray, byteOffset = 0, byteLength = Infinity): Uint8Array {
		return new Uint8Array(a.buffer, a.byteOffset + byteOffset, Math.min(a.byteLength, byteLength));
	}

	/** @internal */
	static assertView(view: null): null;
	static assertView(view: Uint8Array): Uint8Array;
	static assertView(view: Uint8Array | null): Uint8Array | null;
	static assertView(view: Uint8Array | null): Uint8Array | null {
		if (view && !ArrayBuffer.isView(view)) {
			throw new Error(`Method requires Uint8Array parameter; received "${typeof view}".`);
		}
		return view as Uint8Array;
	}
}
