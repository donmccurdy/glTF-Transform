/**
 * # BufferUtils
 *
 * *Common utilities for working with ArrayBuffer and Buffer objects.*
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
			const data = dataURI.split(',')[1];
			const isBase64 = dataURI.indexOf('base64') >= 0;
			return this.trim(Buffer.from(data, isBase64 ? 'base64' : 'utf8'));
		}
	}

	/** Encodes text to an ArrayBuffer. */
	static encodeText(text: string): ArrayBuffer {
		if (typeof TextEncoder !== 'undefined') {
			return new TextEncoder().encode(text).buffer;
		}
		return this.trim(Buffer.from(text));
	}

	/** Decodes an ArrayBuffer to text. */
	static decodeText(buffer: ArrayBuffer): string {
		if (typeof TextDecoder !== 'undefined') {
			return new TextDecoder().decode(buffer);
		}
		return Buffer.from(buffer).toString('utf8');
	}

	/** Copies an ArrayBuffer from a Buffer's content. */
	static trim(buffer: Buffer): ArrayBuffer {
		const {byteOffset, byteLength} = buffer;
		return buffer.buffer.slice(byteOffset, byteOffset + byteLength);
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
	*
	* Reference: [glTF → Data Alignment](https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#data-alignment)
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
