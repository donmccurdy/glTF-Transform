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
	/** Returns the size of a JPEG image. */
	public static getSizeJPEG (buffer: ArrayBuffer): vec2 {
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
	public static getSizePNG (buffer: ArrayBuffer): vec2 {
		const view = new DataView(buffer);
		const magic = BufferUtils.decodeText(buffer.slice(12, 16));
		if (magic === PNG_FRIED_CHUNK_NAME) {
			return [view.getUint32(32, false), view.getUint32(36, false)];
		}
		return [view.getUint32(16, false), view.getUint32(20, false)];
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
