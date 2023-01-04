import {
	Extension,
	ImageUtils,
	ImageUtilsFormat,
	PropertyType,
	ReaderContext,
	WriterContext,
	vec2,
	BufferUtils,
} from '@gltf-transform/core';
import { EXT_TEXTURE_AVIF } from '../constants';

const NAME = EXT_TEXTURE_AVIF;

class AVIFImageUtils implements ImageUtilsFormat {
	match(array: Uint8Array): boolean {
		return array.length >= 12 && BufferUtils.decodeText(array.slice(4, 12)) === 'ftypavif';
	}
	getSize(array: Uint8Array): vec2 | null {
		if (!this.match(array)) return null;
		// Reference: https://stackoverflow.com/questions/66222773/how-to-get-image-dimensions-from-an-avif-file
		return null; // TODO
	}
	getChannels(_buffer: Uint8Array): number {
		return 4;
	}
}

/**
 * # TextureAVIF
 *
 * [`EXT_texture_avif`](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_texture_avif/)
 * enables AVIF images for any material texture.
 *
 * [[include:VENDOR_EXTENSIONS_NOTE.md]]
 *
 * AVIF typically provides the minimal transmission
 * size, but [requires browser support](https://caniuse.com/avif). Like PNG and JPEG, a AVIF image is
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
	public readonly extensionName = NAME;
	/** @hidden */
	public readonly prereadTypes = [PropertyType.TEXTURE];
	public static readonly EXTENSION_NAME = NAME;

	/** @hidden */
	public static register(): void {
		ImageUtils.registerFormat('image/avif', new AVIFImageUtils());
	}

	/** @hidden */
	public preread(context: ReaderContext): this {
		const textureDefs = context.jsonDoc.json.textures || [];
		textureDefs.forEach((textureDef) => {
			if (textureDef.extensions && textureDef.extensions[NAME]) {
				textureDef.source = (textureDef.extensions[NAME] as { source: number }).source;
			}
		});
		return this;
	}

	/** @hidden */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public read(context: ReaderContext): this {
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
							textureDef.extensions[NAME] = { source: textureDef.source };
							delete textureDef.source;
						}
					});
				}
			});

		return this;
	}
}
