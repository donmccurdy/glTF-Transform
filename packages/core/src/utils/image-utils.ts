import { vec2 } from '../constants';
import { BufferUtils } from './buffer-utils';

// Used to detect "fried" png's: http://www.jongware.com/pngdefry.html
const PNG_FRIED_CHUNK_NAME = 'CgBI';

/*
 * PNG signature: 'PNG\r\n\x1a\n'
 * PNG image header chunk name: 'IHDR'
 */

/**
 * # ImageUtils
 *
 * *Common utilities for working with image data.*
 *
 * @category Utilities
 */
class ImageUtils {
	/** Returns [conservative] estimate of the dimensions of the image. */
	public static getSize (buffer: ArrayBuffer, mimeType: string): vec2 {
		switch (mimeType) {
			case 'image/png': return this._getSizePNG(buffer);
			case 'image/jpeg': return this._getSizeJPEG(buffer);
			case 'image/webp': return this._getSizeWebP(buffer);
			case 'image/ktx2': return this._getSizeKTX2(buffer);
			default: return null;
		}
	}

	/** Returns [conservative] estimate of the number of channels in the image. */
	public static getChannels (buffer: ArrayBuffer, mimeType: string): number {
		switch (mimeType) {
			case 'image/png': return 4;
			case 'image/jpeg': return 3;
			case 'image/webp': return 4;
			case 'image/ktx2': return 4;
			default: return 4;
		}
	}

	/** Returns [conservative] estimate of the GPU memory required by this image. */
	public static getMemSize (buffer: ArrayBuffer, mimeType: string): number {
		if (mimeType === 'image/ktx2') return buffer.byteLength;
		const resolution = this.getSize(buffer, mimeType);
		const channels = this.getChannels(buffer, mimeType);
		return resolution ? resolution[0] * resolution[1] * channels : null;
	}

	/** Returns the size of a JPEG image. */
	private static _getSizeJPEG (buffer: ArrayBuffer): vec2 {
		// Skip 4 chars, they are for signature
		let view = new DataView(buffer, 4);

		let i, next;
		while (view.byteLength) {
			// read length of the next block
			i = view.getUint16(0, false);
			// i = buffer.readUInt16BE(0);

			// ensure correct format
			validateBuffer(view, i);

			// 0xFFC0 is baseline standard(SOF)
			// 0xFFC1 is baseline optimized(SOF)
			// 0xFFC2 is progressive(SOF2)
			next = view.getUint8(i + 1);
			if (next === 0xC0 || next === 0xC1 || next === 0xC2) {
				return [view.getUint16(i + 7, false), view.getUint16(i + 5, false)]
			}

			// move to the next block
			view = new DataView(buffer, view.byteOffset + i + 2);
		}

		throw new TypeError('Invalid JPG, no size found');
	}

	/** Returns the size of a PNG image. */
	private static _getSizePNG (buffer: ArrayBuffer): vec2 {
		const view = new DataView(buffer);
		const magic = BufferUtils.decodeText(buffer.slice(12, 16));
		if (magic === PNG_FRIED_CHUNK_NAME) {
			return [view.getUint32(32, false), view.getUint32(36, false)];
		}
		return [view.getUint32(16, false), view.getUint32(20, false)];
	}

	private static _getSizeWebP (buffer: ArrayBuffer): vec2 {
		// Reference: http://tools.ietf.org/html/rfc6386
		const RIFF = BufferUtils.decodeText(buffer.slice(0, 4));
		const WEBP = BufferUtils.decodeText(buffer.slice(8, 12));
		if (RIFF !== 'RIFF' && WEBP !== 'WEBP') return null;

		const view = new DataView(buffer);

		// Reference: https://wiki.tcl-lang.org/page/Reading+WEBP+image+dimensions
		let offset = 12;
		while (offset < buffer.byteLength) {
			const chunkId = BufferUtils.decodeText(buffer.slice(offset, offset + 4));
			const chunkByteLength = view.getUint32(offset + 4, true);
			if (chunkId === 'VP8 ') {
				const width = view.getInt16(offset + 14, true) & 0x3fff;
				const height = view.getInt16(offset + 16, true) & 0x3fff;
				return [width, height];
			} else if (chunkId === 'VP8L') {
				// TODO(feat): Support parsing VP8L chunk.

				// binary scan $chunk1 a4icucu4 vp8 size signature sizeInfo
				// a4: 4-byte string
				// i: 4-byte int
				// c: 1-byte int
				// u: 1-byte ???
				// c: 1-byte int
				// u: 4-byte ???
				//
				// lassign $sizeInfo b0 b1 b2 b3
				// set width [expr {1 + ((($b1 & 0x3F) << 8) | $b0)}]
				// set height [expr {1 + ((($b3 & 0xF) << 10) | ($b2 << 2) | (($b1 & 0xC0) >> 6))}]
				return null;
			}
			offset += 8 + (chunkByteLength % 2 ? chunkByteLength + 1 : chunkByteLength);
		}

		return null;
	}

	private static _getSizeKTX2 (buffer: ArrayBuffer): vec2 {
		const magic = BufferUtils.decodeText(buffer.slice(1, 7));
		if (magic !== 'KTX 20') return null;
		const view = new DataView(buffer);
		return [view.getUint32(20, true), view.getUint32(24, true)];
	}

	public static mimeTypeToExtension(mimeType: string): string {
		if (mimeType === 'image/jpeg') return 'jpg';
		return mimeType.split('/').pop();
	}

	public static extensionToMimeType(extension: string): string {
		if (extension === 'jpg') return 'image/jpeg';
		return `image/${extension}`;
	}
}

function validateBuffer (view: DataView, i: number): void {
    // index should be within buffer limits
    if (i > view.byteLength) {
        throw new TypeError('Corrupt JPG, exceeded buffer limits');
    }
    // Every JPEG block must begin with a 0xFF
    if (view.getUint8(i) !== 0xFF) {
        throw new TypeError('Invalid JPG, marker table corrupted');
    }
}

export { ImageUtils };
