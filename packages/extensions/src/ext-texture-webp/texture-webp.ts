import {
	BufferUtils,
	Extension,
	ImageUtils,
	type ImageUtilsFormat,
	PropertyType,
	type ReaderContext,
	type vec2,
	type WriterContext,
} from '@gltf-transform/core';
import { EXT_TEXTURE_WEBP } from '../constants.js';

class WEBPImageUtils implements ImageUtilsFormat {
	match(array: Uint8Array): boolean {
		return array.length >= 12 && array[8] === 87 && array[9] === 69 && array[10] === 66 && array[11] === 80;
	}
	getSize(array: Uint8Array): vec2 | null {
		// Reference: http://tools.ietf.org/html/rfc6386
		const RIFF = BufferUtils.decodeText(array.slice(0, 4));
		const WEBP = BufferUtils.decodeText(array.slice(8, 12));
		if (RIFF !== 'RIFF' || WEBP !== 'WEBP') return null;

		const view = new DataView(array.buffer, array.byteOffset);

		// Reference: https://wiki.tcl-lang.org/page/Reading+WEBP+image+dimensions
		let offset = 12;
		while (offset < view.byteLength) {
			const chunkId = BufferUtils.decodeText(
				new Uint8Array([
					view.getUint8(offset),
					view.getUint8(offset + 1),
					view.getUint8(offset + 2),
					view.getUint8(offset + 3),
				]),
			);
			const chunkByteLength = view.getUint32(offset + 4, true);
			if (chunkId === 'VP8 ') {
				const width = view.getInt16(offset + 14, true) & 0x3fff;
				const height = view.getInt16(offset + 16, true) & 0x3fff;
				return [width, height];
			} else if (chunkId === 'VP8L') {
				const b0 = view.getUint8(offset + 9);
				const b1 = view.getUint8(offset + 10);
				const b2 = view.getUint8(offset + 11);
				const b3 = view.getUint8(offset + 12);
				const width = 1 + (((b1 & 0x3f) << 8) | b0);
				const height = 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
				return [width, height];
			}
			offset += 8 + chunkByteLength + (chunkByteLength % 2);
		}

		return null;
	}
	getChannels(_buffer: Uint8Array): number {
		return 4;
	}
}

/**
 * [`EXT_texture_webp`](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_texture_webp/)
 * enables WebP images for any material texture.
 *
 * WebP offers greatly reduced transmission size, but
 * [requires browser support](https://caniuse.com/webp). Like PNG and JPEG, a WebP image is
 * *fully decompressed* when uploaded to the GPU, which increases upload time and GPU memory cost.
 * For seamless uploads and minimal GPU memory cost, it is necessary to use a GPU texture format
 * like Basis Universal, with the `KHR_texture_basisu` extension.
 *
 * Defining no {@link ExtensionProperty} types, this {@link Extension} is simply attached to the
 * {@link Document}, and affects the entire Document by allowing use of the `image/webp` MIME type
 * and passing WebP image data to the {@link Texture.setImage} method. Without the Extension, the
 * same MIME types and image data would yield an invalid glTF document, under the stricter core glTF
 * specification.
 *
 * Properties:
 * - N/A
 *
 * ### Example
 *
 * ```typescript
 * import { EXTTextureWebP } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const webpExtension = document.createExtension(EXTTextureWebP)
 * 	.setRequired(true);
 * document.createTexture('MyWebPTexture')
 * 	.setMimeType('image/webp')
 * 	.setImage(fs.readFileSync('my-texture.webp'));
 * ```
 *
 * WebP conversion is not done automatically when adding the extension as shown above — you must
 * convert the image data first, then pass the `.webp` payload to {@link Texture.setImage}.
 *
 * When the `EXT_texture_webp` extension is added to a file by glTF-Transform, the extension should
 * always be required. This tool does not support writing assets that "fall back" to optional PNG or
 * JPEG image data.
 */
export class EXTTextureWebP extends Extension {
	public readonly extensionName: typeof EXT_TEXTURE_WEBP = EXT_TEXTURE_WEBP;
	/** @hidden */
	public readonly prereadTypes: PropertyType[] = [PropertyType.TEXTURE];
	public static readonly EXTENSION_NAME: typeof EXT_TEXTURE_WEBP = EXT_TEXTURE_WEBP;

	/** @hidden */
	public static register(): void {
		ImageUtils.registerFormat('image/webp', new WEBPImageUtils());
	}

	/** @hidden */
	public preread(context: ReaderContext): this {
		const textureDefs = context.jsonDoc.json.textures || [];
		textureDefs.forEach((textureDef) => {
			if (textureDef.extensions && textureDef.extensions[EXT_TEXTURE_WEBP]) {
				textureDef.source = (textureDef.extensions[EXT_TEXTURE_WEBP] as { source: number }).source;
			}
		});
		return this;
	}

	/** @hidden */
	public read(_context: ReaderContext): this {
		return this;
	}

	/** @hidden */
	public write(context: WriterContext): this {
		const jsonDoc = context.jsonDoc;

		this.document
			.getRoot()
			.listTextures()
			.forEach((texture) => {
				if (texture.getMimeType() === 'image/webp') {
					const imageIndex = context.imageIndexMap.get(texture);
					const textureDefs = jsonDoc.json.textures || [];
					textureDefs.forEach((textureDef) => {
						if (textureDef.source === imageIndex) {
							textureDef.extensions = textureDef.extensions || {};
							textureDef.extensions[EXT_TEXTURE_WEBP] = { source: textureDef.source };
							delete textureDef.source;
						}
					});
				}
			});

		return this;
	}
}
