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
import { EXT_TEXTURE_AVIF } from '../constants.js';

class AVIFImageUtils implements ImageUtilsFormat {
	match(array: Uint8Array): boolean {
		return array.length >= 12 && BufferUtils.decodeText(array.slice(4, 12)) === 'ftypavif';
	}
	/**
	 * Probes size of AVIF or HEIC image. Assumes a single static image, without
	 * orientation or other metadata that would affect dimensions.
	 */
	getSize(array: Uint8Array): vec2 | null {
		if (!this.match(array)) return null;

		// References:
		// - https://stackoverflow.com/questions/66222773/how-to-get-image-dimensions-from-an-avif-file
		// - https://github.com/nodeca/probe-image-size/blob/master/lib/parse_sync/avif.js

		const view = new DataView(array.buffer, array.byteOffset, array.byteLength);

		let box = unbox(view, 0);
		if (!box) return null;

		let offset = box.end;
		while ((box = unbox(view, offset))) {
			if (box.type === 'meta') {
				offset = box.start + 4; // version + flags
			} else if (box.type === 'iprp' || box.type === 'ipco') {
				offset = box.start;
			} else if (box.type === 'ispe') {
				return [view.getUint32(box.start + 4), view.getUint32(box.start + 8)];
			} else if (box.type === 'mdat') {
				break; // mdat should be last, unlikely to find metadata past here.
			} else {
				offset = box.end;
			}
		}

		return null;
	}
	getChannels(_buffer: Uint8Array): number {
		return 4;
	}
}

/**
 * [`EXT_texture_avif`](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_texture_avif/)
 * enables AVIF images for any material texture.
 *
 * AVIF offers greatly reduced transmission size, but
 * [requires browser support](https://caniuse.com/avif). Like PNG and JPEG, an AVIF image is
 * *fully decompressed* when uploaded to the GPU, which increases upload time and GPU memory cost.
 * For seamless uploads and minimal GPU memory cost, it is necessary to use a GPU texture format
 * like Basis Universal, with the `KHR_texture_basisu` extension.
 *
 * Defining no {@link ExtensionProperty} types, this {@link Extension} is simply attached to the
 * {@link Document}, and affects the entire Document by allowing use of the `image/avif` MIME type
 * and passing AVIF image data to the {@link Texture.setImage} method. Without the Extension, the
 * same MIME types and image data would yield an invalid glTF document, under the stricter core glTF
 * specification.
 *
 * Properties:
 * - N/A
 *
 * ### Example
 *
 * ```typescript
 * import { TextureAVIF } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const avifExtension = document.createExtension(TextureAVIF)
 * 	.setRequired(true);
 * document.createTexture('MyAVIFTexture')
 * 	.setMimeType('image/avif')
 * 	.setImage(fs.readFileSync('my-texture.avif'));
 * ```
 *
 * AVIF conversion is not done automatically when adding the extension as shown above — you must
 * convert the image data first, then pass the `.avif` payload to {@link Texture.setImage}.
 *
 * When the `EXT_texture_avif` extension is added to a file by glTF-Transform, the extension should
 * always be required. This tool does not support writing assets that "fall back" to optional PNG or
 * JPEG image data.
 */
export class EXTTextureAVIF extends Extension {
	public readonly extensionName: typeof EXT_TEXTURE_AVIF = EXT_TEXTURE_AVIF;
	/** @hidden */
	public readonly prereadTypes: PropertyType[] = [PropertyType.TEXTURE];
	public static readonly EXTENSION_NAME: typeof EXT_TEXTURE_AVIF = EXT_TEXTURE_AVIF;

	/** @hidden */
	public static register(): void {
		ImageUtils.registerFormat('image/avif', new AVIFImageUtils());
	}

	/** @hidden */
	public preread(context: ReaderContext): this {
		const textureDefs = context.jsonDoc.json.textures || [];
		textureDefs.forEach((textureDef) => {
			if (textureDef.extensions && textureDef.extensions[EXT_TEXTURE_AVIF]) {
				textureDef.source = (textureDef.extensions[EXT_TEXTURE_AVIF] as { source: number }).source;
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
				if (texture.getMimeType() === 'image/avif') {
					const imageIndex = context.imageIndexMap.get(texture);
					const textureDefs = jsonDoc.json.textures || [];
					textureDefs.forEach((textureDef) => {
						if (textureDef.source === imageIndex) {
							textureDef.extensions = textureDef.extensions || {};
							textureDef.extensions[EXT_TEXTURE_AVIF] = { source: textureDef.source };
							delete textureDef.source;
						}
					});
				}
			});

		return this;
	}
}

interface IBox {
	type: string;
	start: number;
	end: number;
}

function unbox(data: DataView, offset: number): IBox | null {
	if (data.byteLength < 4 + offset) return null;

	// size includes first 4 bytes (length)
	const size = data.getUint32(offset);
	if (data.byteLength < size + offset || size < 8) return null;

	return {
		type: BufferUtils.decodeText(new Uint8Array(data.buffer, data.byteOffset + offset + 4, 4)),
		start: offset + 8,
		end: offset + size,
	};
}
