import { BufferUtils, Extension, ImageUtils, ImageUtilsFormat, PropertyType, ReaderContext, WriterContext, vec2 } from '@gltf-transform/core';
import { EXT_TEXTURE_WEBP } from '../constants';

const NAME = EXT_TEXTURE_WEBP;

class WEBPImageUtils implements ImageUtilsFormat {
	getSize (buffer: ArrayBuffer): vec2 | null {
		// Reference: http://tools.ietf.org/html/rfc6386
		const RIFF = BufferUtils.decodeText(buffer.slice(0, 4));
		const WEBP = BufferUtils.decodeText(buffer.slice(8, 12));
		if (RIFF !== 'RIFF' || WEBP !== 'WEBP') return null;

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
				const b0 = view.getUint8(offset + 9);
				const b1 = view.getUint8(offset + 10);
				const b2 = view.getUint8(offset + 11);
				const b3 = view.getUint8(offset + 12);
				const width = 1 + (((b1 & 0x3F) << 8) | b0);
				const height = 1 + (((b3 & 0xF) << 10) | (b2 << 2) | ((b1 & 0xC0) >> 6));
				return [width, height];
			}
			offset += 8 + chunkByteLength + (chunkByteLength % 2);
		}

		return null;
	}
	getChannels (_buffer: ArrayBuffer): number {
		return 4;
	}
}


/**
 * # TextureWebP
 *
 * [`EXT_texture_webp`](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_texture_webp/)
 * enables WebP images for any material texture.
 *
 * [[include:VENDOR_EXTENSIONS_NOTE.md]]
 *
 * WebP typically provides the minimal transmission
 * size, but [requires browser support](https://caniuse.com/webp). Like PNG and JPEG, a WebP image is
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
 * import { TextureWebP } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const webpExtension = document.createExtension(TextureWebP)
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
export class TextureWebP extends Extension {
	public readonly extensionName = NAME;
	public readonly prereadTypes = [PropertyType.TEXTURE];
	public static readonly EXTENSION_NAME = NAME;

	public static register (): void {
		ImageUtils.registerFormat('image/webp', new WEBPImageUtils());
	}

	public preread(context: ReaderContext): this {
		const textureDefs = context.jsonDoc.json.textures || [];
		textureDefs.forEach((textureDef) => {
			if (textureDef.extensions && textureDef.extensions[NAME]) {
				textureDef.source = (textureDef.extensions[NAME] as {source: number}).source;
			}
		});
		return this;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public read(context: ReaderContext): this {
		return this;
	}

	public write(context: WriterContext): this {
		const jsonDoc = context.jsonDoc;

		this.doc.getRoot()
			.listTextures()
			.forEach((texture) => {
				if (texture.getMimeType() === 'image/webp') {
					const imageIndex = context.imageIndexMap.get(texture);
					const textureDefs = jsonDoc.json.textures || [];
					textureDefs.forEach((textureDef) => {
						if (textureDef.source === imageIndex) {
							textureDef.extensions = textureDef.extensions || {};
							textureDef.extensions[NAME] = {source: textureDef.source};
							delete textureDef.source;
						}
					});
				}
			});

		return this;
	}
}
