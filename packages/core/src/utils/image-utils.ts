import { vec2 } from '../constants';
import { BufferUtils } from './buffer-utils';

/** Implements support for an image format in the {@link ImageUtils} class. */
export interface ImageUtilsFormat {
	getSize(buffer: ArrayBuffer): vec2 | null;
	getChannels(buffer: ArrayBuffer): number | null;
	getGPUByteLength?(buffer: ArrayBuffer): number | null;
}

/** JPEG image support. */
class JPEGImageUtils implements ImageUtilsFormat {
	getSize (buffer: ArrayBuffer): vec2 {
		// Skip 4 chars, they are for signature
		let view = new DataView(buffer, 4);

		let i: number, next: number;
		while (view.byteLength) {
			// read length of the next block
			i = view.getUint16(0, false);
			// i = buffer.readUInt16BE(0);

			// ensure correct format
			validateJPEGBuffer(view, i);

			// 0xFFC0 is baseline standard(SOF)
			// 0xFFC1 is baseline optimized(SOF)
			// 0xFFC2 is progressive(SOF2)
			next = view.getUint8(i + 1);
			if (next === 0xC0 || next === 0xC1 || next === 0xC2) {
				return [view.getUint16(i + 7, false), view.getUint16(i + 5, false)];
			}

			// move to the next block
			view = new DataView(buffer, view.byteOffset + i + 2);
		}

		throw new TypeError('Invalid JPG, no size found');
	}

	getChannels (_buffer: ArrayBuffer): number {
		return 3;
	}
}

/**
 * PNG image support.
 *
 * PNG signature: 'PNG\r\n\x1a\n'
 * PNG image header chunk name: 'IHDR'
 */
class PNGImageUtils implements ImageUtilsFormat {
	// Used to detect "fried" png's: http://www.jongware.com/pngdefry.html
	static PNG_FRIED_CHUNK_NAME = 'CgBI';
	getSize (buffer: ArrayBuffer): vec2 {
		const view = new DataView(buffer);
		const magic = BufferUtils.decodeText(buffer.slice(12, 16));
		if (magic === PNGImageUtils.PNG_FRIED_CHUNK_NAME) {
			return [view.getUint32(32, false), view.getUint32(36, false)];
		}
		return [view.getUint32(16, false), view.getUint32(20, false)];
	}
	getChannels (_buffer: ArrayBuffer): number {
		return 4;
	}
}

/**
 * # ImageUtils
 *
 * *Common utilities for working with image data.*
 *
 * @category Utilities
 */
export class ImageUtils {
	static impls: Record<string, ImageUtilsFormat> = {
		'image/jpeg': new JPEGImageUtils(),
		'image/png': new PNGImageUtils()
	};

	/** Registers support for a new image format; useful for certain extensions. */
	public static registerFormat(mimeType: string, impl: ImageUtilsFormat): void {
		this.impls[mimeType] = impl;
	}

	/** Returns the dimensions of the image. */
	public static getSize (buffer: ArrayBuffer, mimeType: string): vec2 | null {
		if (!this.impls[mimeType]) return null;
		return this.impls[mimeType].getSize(buffer);
	}

	/**
	 * Returns a conservative estimate of the number of channels in the image. For some image
	 * formats, the method may return 4 indicating the possibility of an alpha channel, without
	 * the ability to guarantee that an alpha channel is present.
	 */
	public static getChannels (buffer: ArrayBuffer, mimeType: string): number | null {
		if (!this.impls[mimeType]) return null;
		return this.impls[mimeType].getChannels(buffer);
	}

	/** Returns a conservative estimate of the GPU memory required by this image. */
	public static getMemSize (buffer: ArrayBuffer, mimeType: string): number | null {
		if (!this.impls[mimeType]) return null;

		if (this.impls[mimeType].getGPUByteLength) {
			return this.impls[mimeType].getGPUByteLength!(buffer);
		}

		let uncompressedBytes = 0;
		const channels = 4; // See https://github.com/donmccurdy/glTF-Transform/issues/151.
		const resolution = this.getSize(buffer, mimeType);
		if (!resolution) return null;

		while (resolution[0] > 1 || resolution[1] > 1) {
			uncompressedBytes += resolution[0] * resolution[1] * channels;
			resolution[0] = Math.max(Math.floor(resolution[0] / 2), 1);
			resolution[1] = Math.max(Math.floor(resolution[1] / 2), 1);
		}
		uncompressedBytes += 1 * 1 * channels;
		return uncompressedBytes;
	}

	/** Returns the preferred file extension for the given MIME type. */
	public static mimeTypeToExtension(mimeType: string): string {
		if (mimeType === 'image/jpeg') return 'jpg';
		return mimeType.split('/').pop()!;
	}

	/** Returns the MIME type for the given file extension. */
	public static extensionToMimeType(extension: string): string {
		if (extension === 'jpg') return 'image/jpeg';
		return `image/${extension}`;
	}
}

function validateJPEGBuffer (view: DataView, i: number): DataView {
    // index should be within buffer limits
    if (i > view.byteLength) {
        throw new TypeError('Corrupt JPG, exceeded buffer limits');
    }
    // Every JPEG block must begin with a 0xFF
    if (view.getUint8(i) !== 0xFF) {
        throw new TypeError('Invalid JPG, marker table corrupted');
    }

	return view;
}
