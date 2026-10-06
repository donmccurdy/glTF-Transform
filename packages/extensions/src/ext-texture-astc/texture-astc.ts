import {
	Extension,
	ImageUtils,
	PropertyType,
	type ReaderContext,
	type Texture,
	type WriterContext,
} from '@gltf-transform/core';
import { EXT_TEXTURE_ASTC } from '../constants.js';
import { isASTC, KTX2ImageUtils, readKTXOrNull } from '../ktx2-utils.js';

interface ASTCDef {
	source: number;
}

/**
 * [`EXT_texture_astc`](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Vendor/EXT_texture_astc)
 * enables KTX2 GPU textures with ASTC compression for any material texture.
 *
 * Unlike Basis Universal textures (see {@link KHRTextureBasisu}), ASTC textures are not transcoded
 * at runtime: engines upload ASTC data to the GPU directly, on platforms with hardware ASTC
 * support. This allows any ASTC block size and quality preset, at the cost of portability.
 *
 * Defining no {@link ExtensionProperty} types, this {@link Extension} is simply attached to the
 * {@link Document}, and affects the entire Document by allowing use of the `image/ktx2` MIME type
 * and passing KTX2 image data to the {@link Texture.setImage} method. Without the Extension, the
 * same MIME types and image data would yield an invalid glTF document, under the stricter core glTF
 * specification.
 *
 * Only KTX2 images containing ASTC data (DFD color model `KHR_DF_MODEL_ASTC`) are written with
 * this extension. Other KTX2 images, such as Basis Universal textures, are left to other
 * extensions like {@link KHRTextureBasisu}.
 *
 * Properties:
 * - N/A
 *
 * ### Example
 *
 * ```typescript
 * import { EXTTextureASTC } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const astcExtension = document.createExtension(EXTTextureASTC)
 * 	.setRequired(true);
 * document.createTexture('MyASTCTexture')
 * 	.setMimeType('image/ktx2')
 * 	.setImage(fs.readFileSync('my-texture.ktx2'));
 * ```
 *
 * Compression is not done automatically when adding the extension as shown above — you must
 * compress the image data first, then pass the `.ktx2` payload to {@link Texture.setImage}.
 *
 * When the `EXT_texture_astc` extension is added to a file by glTF Transform, the extension
 * should always be required. This tool does not support writing assets that "fall back" to optional
 * PNG or JPEG image data.
 *
 * @experimental EXT_texture_astc is a draft specification.
 */
export class EXTTextureASTC extends Extension {
	public static readonly EXTENSION_NAME: typeof EXT_TEXTURE_ASTC = EXT_TEXTURE_ASTC;
	public readonly extensionName: typeof EXT_TEXTURE_ASTC = EXT_TEXTURE_ASTC;
	/** @hidden */
	public readonly prereadTypes: PropertyType[] = [PropertyType.TEXTURE];

	/** @hidden */
	public static register(): void {
		ImageUtils.registerFormat('image/ktx2', new KTX2ImageUtils());
	}

	/** @hidden */
	public preread(context: ReaderContext): this {
		const textureDefs = context.jsonDoc.json.textures || [];
		textureDefs.forEach((textureDef) => {
			if (textureDef.extensions && textureDef.extensions[EXT_TEXTURE_ASTC]) {
				textureDef.source = (textureDef.extensions[EXT_TEXTURE_ASTC] as ASTCDef).source;
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
				if (texture.getMimeType() !== 'image/ktx2') return;

				const container = readKTXOrNull(texture.getImage());
				if (!container || !isASTC(container)) return;

				const imageIndex = context.imageIndexMap.get(texture);
				const textureDefs = jsonDoc.json.textures || [];
				textureDefs.forEach((textureDef) => {
					if (textureDef.source === imageIndex) {
						textureDef.extensions = textureDef.extensions || {};
						textureDef.extensions[EXT_TEXTURE_ASTC] = { source: textureDef.source };
						delete textureDef.source;
					}
				});
			});

		return this;
	}
}
