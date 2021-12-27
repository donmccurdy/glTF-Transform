import { TypedArray } from '../constants';
/**
 * # BufferUtils
 *
 * *Common utilities for working with ArrayBuffer and Buffer objects.*
 *
 * @category Utilities
 */
export declare class BufferUtils {
    /** Creates a byte array from a Data URI. */
    static createBufferFromDataURI(dataURI: string): Uint8Array;
    /** Encodes text to a byte array. */
    static encodeText(text: string): Uint8Array;
    /** Decodes a byte array to text. */
    static decodeText(array: Uint8Array): string;
    /**
     * Concatenates N byte arrays.
     */
    static concat(arrays: Uint8Array[]): Uint8Array;
    /**
     * Pads a Uint8Array to the next 4-byte boundary.
     *
     * Reference: [glTF → Data Alignment](https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#data-alignment)
     */
    static pad(srcArray: Uint8Array, paddingByte?: number): Uint8Array;
    /** Pads a number to 4-byte boundaries. */
    static padNumber(v: number): number;
    /** Returns true if given byte array instances are equal. */
    static equals(a: Uint8Array, b: Uint8Array): boolean;
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
    static toView(a: TypedArray, byteOffset?: number, byteLength?: number): Uint8Array;
    static assertView(view: Uint8Array): Uint8Array;
    static assertView(view: Uint8Array | null): Uint8Array | null;
}
