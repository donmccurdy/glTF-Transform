import type { vec2 } from '../constants.js';
import { BufferUtils } from './buffer-utils.js';

/** Implements support for an image format in the {@link ImageUtils} class. */
export interface ImageUtilsFormat {
	match(buffer: Uint8Array): boolean;
	getSize(buffer: Uint8Array): vec2 | null;
	getChannels(buffer: Uint8Array): number | null;
	getVRAMByteLength?(buffer: Uint8Array): number | null;
}

/** JPEG image support. */
class JPEGImageUtils implements ImageUtilsFormat {
	match(array: Uint8Array): boolean {
		return array.length >= 3 && array[0] === 255 && array[1] === 216 && array[2] === 255;
	}
	getSize(array: Uint8Array): vec2 {
		// Skip 4 chars, they are for signature
		let view = new DataView(array.buffer, array.byteOffset + 4);

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
			if (next === 0xc0 || next === 0xc1 || next === 0xc2) {
				return [view.getUint16(i + 7, false), view.getUint16(i + 5, false)];
			}

			// move to the next block
			view = new DataView(array.buffer, view.byteOffset + i + 2);
		}

		throw new TypeError('Invalid JPG, no size found');
	}

	getChannels(_buffer: Uint8Array): number {
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
	match(array: Uint8Array): boolean {
		return (
			array.length >= 8 &&
			array[0] === 0x89 &&
			array[1] === 0x50 &&
			array[2] === 0x4e &&
			array[3] === 0x47 &&
			array[4] === 0x0d &&
			array[5] === 0x0a &&
			array[6] === 0x1a &&
			array[7] === 0x0a
		);
	}
	getSize(array: Uint8Array): vec2 {
		const view = new DataView(array.buffer, array.byteOffset);
		const magic = BufferUtils.decodeText(array.slice(12, 16));
		if (magic === PNGImageUtils.PNG_FRIED_CHUNK_NAME) {
			return [view.getUint32(32, false), view.getUint32(36, false)];
		}
		return [view.getUint32(16, false), view.getUint32(20, false)];
	}
	getChannels(_buffer: Uint8Array): number {
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
		'image/png': new PNGImageUtils(),
	};

	/** Registers support for a new image format; useful for certain extensions. */
	public static registerFormat(mimeType: string, impl: ImageUtilsFormat): void {
		this.impls[mimeType] = impl;
	}

	/**
	 * Returns detected MIME type of the given image buffer. Note that for image
	 * formats with support provided by extensions, the extension must be
	 * registered with an I/O class before it can be detected by ImageUtils.
	 */
	public static getMimeType(buffer: Uint8Array): string | null {
		for (const mimeType in this.impls) {
			if (this.impls[mimeType].match(buffer)) {
				return mimeType;
			}
		}
		return null;
	}

	/** Returns the dimensions of the image. */
	public static getSize(buffer: Uint8Array, mimeType: string): vec2 | null {
		if (!this.impls[mimeType]) return null;
		return this.impls[mimeType].getSize(buffer);
	}

	/**
	 * Returns a conservative estimate of the number of channels in the image. For some image
	 * formats, the method may return 4 indicating the possibility of an alpha channel, without
	 * the ability to guarantee that an alpha channel is present.
	 */
	public static getChannels(buffer: Uint8Array, mimeType: string): number | null {
		if (!this.impls[mimeType]) return null;
		return this.impls[mimeType].getChannels(buffer);
	}

	/** Returns a conservative estimate of the GPU memory required by this image. */
	public static getVRAMByteLength(buffer: Uint8Array, mimeType: string): number | null {
		if (!this.impls[mimeType]) return null;

		if (this.impls[mimeType].getVRAMByteLength) {
			return this.impls[mimeType].getVRAMByteLength!(buffer);
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
		if (!extension) return '';
		return `image/${extension}`;
	}
}

function validateJPEGBuffer(view: DataView, i: number): DataView {
	// index should be within buffer limits
	if (i > view.byteLength) {
		throw new TypeError('Corrupt JPG, exceeded buffer limits');
	}
	// Every JPEG block must begin with a 0xFF
	if (view.getUint8(i) !== 0xff) {
		throw new TypeError('Invalid JPG, marker table corrupted');
	}

	return view;
}
