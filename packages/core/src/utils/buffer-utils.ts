/**
 * Common utilities for working with ArrayBuffer and Buffer objects.
 *
 * @category Utilities
 */
export class BufferUtils {
	/** Creates an ArrayBuffer from a Data URI. */
	static createBufferFromDataURI(dataURI: string): ArrayBuffer {
		if (typeof Buffer === 'undefined') {
			// Browser.
			const byteString = atob(dataURI.split(',')[1]);
			const ia = new Uint8Array(byteString.length);
			for (let i = 0; i < byteString.length; i++) {
				ia[i] = byteString.charCodeAt(i);
			}
			return ia.buffer;
		} else {
			// Node.js.
			return Buffer.from(dataURI.split(',')[1], 'base64').buffer;
		}
	}

	/** Encodes text to an ArrayBuffer. Platform-agnostic. */
	static encodeText(text: string): ArrayBuffer {
		if (typeof TextEncoder !== 'undefined') {
			return new TextEncoder().encode(text).buffer;
		}
		return this.trim(Buffer.from(text));
	}

	/** Decodes an ArrayBuffer to text. Platform-agnostic. */
	static decodeText(buffer: ArrayBuffer): string {
		if (typeof TextDecoder !== 'undefined') {
			return new TextDecoder().decode(buffer);
		}
		return Buffer.from(buffer).toString('utf8');
	}

	/** Copies an ArrayBuffer from a Buffer, keeping only the needed data. */
	static trim(buffer: Buffer): ArrayBuffer {
		const {byteOffset, byteLength} = buffer;
		return buffer.buffer.slice(byteOffset, byteOffset + byteLength);
	}

	/**
	* Removes segment from an arraybuffer, returning two arraybuffers: [original, removed].
	*/
	static splice (buffer: ArrayBuffer, begin: number, count: number): Array<ArrayBuffer> {
		const a1 = buffer.slice(0, begin);
		const a2 = buffer.slice(begin + count);
		const a = this.join(a1, a2);
		const b = buffer.slice(begin, begin + count);
		return [a, b];
	}

	/** Joins two ArrayBuffers. */
	static join (a: ArrayBuffer, b: ArrayBuffer): ArrayBuffer {
		const out = new Uint8Array(a.byteLength + b.byteLength);
		out.set(new Uint8Array(a), 0);
		out.set(new Uint8Array(b), a.byteLength);
		return out.buffer;
	}

	/**
	* Concatenates N ArrayBuffers.
	*/
	static concat (buffers: ArrayBuffer[]): ArrayBuffer {
		let totalByteLength = 0;
		for (const buffer of buffers) {
			totalByteLength += buffer.byteLength;
		}

		const result = new Uint8Array(totalByteLength);
		let byteOffset = 0;

		for (const buffer of buffers) {
			result.set(new Uint8Array(buffer), byteOffset);
			byteOffset += buffer.byteLength;
		}

		return result.buffer;
	}

	/**
	* Pads an ArrayBuffer to the next 4-byte boundary.
	* https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#data-alignment
	*/
	static pad (arrayBuffer: ArrayBuffer, paddingByte = 0): ArrayBuffer {

		const paddedLength = this.padNumber( arrayBuffer.byteLength );

		if ( paddedLength !== arrayBuffer.byteLength ) {

			const array = new Uint8Array( paddedLength );
			array.set( new Uint8Array( arrayBuffer ) );

			if ( paddingByte !== 0 ) {

				for ( let i = arrayBuffer.byteLength; i < paddedLength; i ++ ) {

					array[ i ] = paddingByte;

				}

			}

			return array.buffer;

		}

		return arrayBuffer;

	}

	/** Pads a number to 4-byte boundaries. */
	static padNumber (v: number): number {

		return Math.ceil( v / 4 ) * 4;

	}

	/** Returns true if given ArrayBuffer instances are equal. */
	static equals(a: ArrayBuffer, b: ArrayBuffer): boolean {
		if (a === b) return true;

		if (a.byteLength !== b.byteLength) return false;

		const view1 = new DataView(a);
		const view2 = new DataView(b);

		let i = a.byteLength;
		while (i--) {
			if (view1.getUint8(i) !== view2.getUint8(i)) return false;
		}

		return true;
	}
}
