import {
	Extension,
	ImageUtils,
	type ImageUtilsFormat,
	PropertyType,
	type ReaderContext,
	type vec2,
	type WriterContext,
} from '@gltf-transform/core';
import { KHR_DF_MODEL_ETC1S, KHR_DF_MODEL_UASTC, read as readKTX } from 'ktx-parse';
import { KHR_TEXTURE_BASISU } from '../constants.js';

interface BasisuDef {
	source: number;
}

class KTX2ImageUtils implements ImageUtilsFormat {
	match(array: Uint8Array): boolean {
		return (
			array[0] === 0xab &&
			array[1] === 0x4b &&
			array[2] === 0x54 &&
			array[3] === 0x58 &&
			array[4] === 0x20 &&
			array[5] === 0x32 &&
			array[6] === 0x30 &&
			array[7] === 0xbb &&
			array[8] === 0x0d &&
			array[9] === 0x0a &&
			array[10] === 0x1a &&
			array[11] === 0x0a
		);
	}
	getSize(array: Uint8Array): vec2 {
		const container = readKTX(array);
		return [container.pixelWidth, container.pixelHeight];
	}
	getChannels(array: Uint8Array): number {
		const container = readKTX(array);
		const dfd = container.dataFormatDescriptor[0];
		if (dfd.colorModel === KHR_DF_MODEL_ETC1S) {
			return dfd.samples.length === 2 && (dfd.samples[1].channelType & 0xf) === 15 ? 4 : 3;
		} else if (dfd.colorModel === KHR_DF_MODEL_UASTC) {
			return (dfd.samples[0].channelType & 0xf) === 3 ? 4 : 3;
		}
		throw new Error(`Unexpected KTX2 colorModel, "${dfd.colorModel}".`);
	}
	getVRAMByteLength(array: Uint8Array): number {
		const container = readKTX(array);
		const hasAlpha = this.getChannels(array) > 3;

		let uncompressedBytes = 0;
		for (let i = 0; i < container.levels.length; i++) {
			const level = container.levels[i];

			// Use level.uncompressedByteLength for UASTC; for ETC1S it's 0.
			if (level.uncompressedByteLength) {
				uncompressedBytes += level.uncompressedByteLength;
			} else {
				const levelWidth = Math.max(1, Math.floor(container.pixelWidth / Math.pow(2, i)));
				const levelHeight = Math.max(1, Math.floor(container.pixelHeight / Math.pow(2, i)));
				const blockSize = hasAlpha ? 16 : 8;
				uncompressedBytes += (levelWidth / 4) * (levelHeight / 4) * blockSize;
			}
		}

		return uncompressedBytes;
	}
}

/**
 * [`KHR_texture_basisu`](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_texture_basisu)
 * enables KTX2 GPU textures with Basis Universal supercompression for any material texture.
 *
 * GPU texture formats, unlike traditional image formats, remain compressed in GPU memory. As a
 * result, they (1) upload to the GPU much more quickly, and (2) require much less GPU memory. In
 * certain cases they may also have smaller filesizes than PNG or JPEG textures, but this is not
 * guaranteed. GPU textures often require more careful tuning during compression to maintain image
 * quality, but this extra effort is worthwhile for applications that need to maintain a smooth
 * framerate while uploading images, or where GPU memory is limited.
 *
 * Defining no {@link ExtensionProperty} types, this {@link Extension} is simply attached to the
 * {@link Document}, and affects the entire Document by allowing use of the `image/ktx2` MIME type
 * and passing KTX2 image data to the {@link Texture.setImage} method. Without the Extension, the
 * same MIME types and image data would yield an invalid glTF document, under the stricter core glTF
 * specification.
 *
 * Properties:
 * - N/A
 *
 * ### Example
 *
 * ```typescript
 * import { KHRTextureBasisu } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const basisuExtension = document.createExtension(KHRTextureBasisu)
 * 	.setRequired(true);
 * document.createTexture('MyCompressedTexture')
 * 	.setMimeType('image/ktx2')
 * 	.setImage(fs.readFileSync('my-texture.ktx2'));
 * ```
 *
 * Compression is not done automatically when adding the extension as shown above — you must
 * compress the image data first, then pass the `.ktx2` payload to {@link Texture.setImage}. The
 * glTF Transform CLI has functions to help with this, or any similar KTX2-capable
 * utility will work.
 *
 * When the `KHR_texture_basisu` extension is added to a file by glTF Transform, the extension
 * should always be required. This tool does not support writing assets that "fall back" to optional
 * PNG or JPEG image data.
 *
 * > _**NOTICE:** Compressing some textures — particularly 3-component (RGB) normal maps, and
 * > occlusion/roughness/metalness maps, may give poor results with the ETC1S compression option.
 * > These issues can often be avoided with the larger UASTC compression option, or by upscaling the
 * > texture before compressing it.
 * >
 * > For best results when authoring new textures, use
 * > [texture dilation](https://docs.substance3d.com/spdoc/padding-134643719.html) and minimize
 * > prominent UV seams._
 */
export class KHRTextureBasisu extends Extension {
	public static readonly EXTENSION_NAME: typeof KHR_TEXTURE_BASISU = KHR_TEXTURE_BASISU;
	public readonly extensionName: typeof KHR_TEXTURE_BASISU = KHR_TEXTURE_BASISU;
	/** @hidden */
	public readonly prereadTypes: PropertyType[] = [PropertyType.TEXTURE];

	/** @hidden */
	public static register(): void {
		ImageUtils.registerFormat('image/ktx2', new KTX2ImageUtils());
	}

	/** @hidden */
	public preread(context: ReaderContext): this {
		context.jsonDoc.json.textures!.forEach((textureDef) => {
			if (textureDef.extensions && textureDef.extensions[KHR_TEXTURE_BASISU]) {
				const basisuDef = textureDef.extensions[KHR_TEXTURE_BASISU] as BasisuDef;
				textureDef.source = basisuDef.source;
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
				if (texture.getMimeType() === 'image/ktx2') {
					const imageIndex = context.imageIndexMap.get(texture);
					jsonDoc.json.textures!.forEach((textureDef) => {
						if (textureDef.source === imageIndex) {
							textureDef.extensions = textureDef.extensions || {};
							textureDef.extensions[KHR_TEXTURE_BASISU] = { source: textureDef.source };
							delete textureDef.source;
						}
					});
				}
			});

		return this;
	}
}
