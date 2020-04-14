interface Size {
    width: number;
    height: number;
}

////////////////////////////////////////////////////////

function extractSize (buffer: Buffer, i: number): Size {
    return {
        'height' : buffer.readUInt16BE(i),
        'width' : buffer.readUInt16BE(i + 2)
    };
}

function validateBuffer (buffer: Buffer, i: number): void {
    // index should be within buffer limits
    if (i > buffer.length) {
        throw new TypeError('Corrupt JPG, exceeded buffer limits');
    }
    // Every JPEG block must begin with a 0xFF
    if (buffer[i] !== 0xFF) {
        throw new TypeError('Invalid JPG, marker table corrupted');
    }
}

////////////////////////////////////////////////////////

// const pngSignature = 'PNG\r\n\x1a\n';
// const pngImageHeaderChunkName = 'IHDR';

// Used to detect "fried" png's: http://www.jongware.com/pngdefry.html
const pngFriedChunkName = 'CgBI';

/** Common utilities for working with image data. */
class ImageUtils {
	/** Returns the {@link Size} of a PNG image. */
	public static getSizeJPEG (buffer: Buffer): Size {
		// Skip 4 chars, they are for signature
		buffer = buffer.slice(4);

		let i, next;
		while (buffer.length) {
			// read length of the next block
			i = buffer.readUInt16BE(0);

			// ensure correct format
			validateBuffer(buffer, i);

			// 0xFFC0 is baseline standard(SOF)
			// 0xFFC1 is baseline optimized(SOF)
			// 0xFFC2 is progressive(SOF2)
			next = buffer[i + 1];
			if (next === 0xC0 || next === 0xC1 || next === 0xC2) {
				return extractSize(buffer, i + 5);
			}

			// move to the next block
			buffer = buffer.slice(i + 2);
		}

		throw new TypeError('Invalid JPG, no size found');
	}

	/** Returns the {@link Size} of a PNG image. */
	public static getSizePNG (buffer: Buffer): Size {
		if (buffer.toString('ascii', 12, 16) === pngFriedChunkName) {
			return {
				width: buffer.readUInt32BE(32),
				height: buffer.readUInt32BE(36)
			};
		}
		return {
			width: buffer.readUInt32BE(16),
			height: buffer.readUInt32BE(20)
		};
	}
}

export { ImageUtils, Size };
