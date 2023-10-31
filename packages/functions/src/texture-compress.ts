import { BufferUtils, Document, ImageUtils, Texture, TextureChannel, Transform, vec2 } from '@gltf-transform/core';
import { EXTTextureAVIF, EXTTextureWebP } from '@gltf-transform/extensions';
import { getTextureChannelMask } from './list-texture-channels.js';
import { listTextureSlots } from './list-texture-slots.js';
import type sharp from 'sharp';
import { createTransform, fitWithin, formatBytes } from './utils.js';
import { TextureResizeFilter } from './texture-resize.js';
import { getPixels, savePixels } from 'ndarray-pixels';
import ndarray from 'ndarray';
import { lanczos2, lanczos3 } from 'ndarray-lanczos';

const NAME = 'textureCompress';

type Format = (typeof TEXTURE_COMPRESS_SUPPORTED_FORMATS)[number];
export const TEXTURE_COMPRESS_SUPPORTED_FORMATS = ['jpeg', 'png', 'webp', 'avif'] as const;
const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export interface TextureCompressOptions {
	/** Instance of the Sharp encoder, which must be installed from the
	 * 'sharp' package and provided by the caller. When not provided, a
	 * platform-specific fallback implementation will be used, and most
	 * quality- and compression-related options are ignored.
	 */
	encoder?: unknown;
	/**
	 * Target image format. If specified, included textures in other formats
	 * will be converted. Default: original format.
	 */
	targetFormat?: Format;
	/**
	 * Resizes textures to given maximum width/height, preserving aspect ratio.
	 * For example, a 4096x8192 texture, resized with limit [2048, 2048] will
	 * be reduced to 1024x2048.
	 */
	resize?: vec2;
	/** Interpolation used if resizing. Default: TextureResizeFilter.LANCZOS3. */
	resizeFilter?: TextureResizeFilter;
	/** Pattern identifying textures to compress, matched to name or URI. */
	pattern?: RegExp | null;
	/**
	 * Pattern matching the format(s) to be compressed or converted. Some examples
	 * of formats include "jpeg" and "png".
	 */
	formats?: RegExp | null;
	/**
	 * Pattern matching the material texture slot(s) to be compressed or converted.
	 * Some examples of slot names include "baseColorTexture", "occlusionTexture",
	 * "metallicRoughnessTexture", and "normalTexture".
	 */
	slots?: RegExp | null;

	/** Quality, 1-100. Default: auto. */
	quality?: number | null;
	/**
	 * Level of CPU effort to reduce file size, 0-100. PNG, WebP, and AVIF
	 * only. Supported only when a Sharp encoder is provided. Default: auto.
	 */
	effort?: number | null;
	/**
	 * Use lossless compression mode. WebP and AVIF only. Supported only when a
	 * Sharp encoder is provided. Default: false.
	 */
	lossless?: boolean;
	/**
	 * Use near lossless compression mode. WebP only. Supported only when a
	 * Sharp encoder is provided. Default: false.
	 */
	nearLossless?: boolean;
}

export type CompressTextureOptions = Omit<TextureCompressOptions, 'pattern' | 'formats' | 'slots'>;

// IMPORTANT: No defaults for quality flags, see https://github.com/donmccurdy/glTF-Transform/issues/969.
export const TEXTURE_COMPRESS_DEFAULTS: Omit<TextureCompressOptions, 'resize' | 'targetFormat' | 'encoder'> = {
	resizeFilter: TextureResizeFilter.LANCZOS3,
	pattern: undefined,
	formats: undefined,
	slots: undefined,
	quality: undefined,
	effort: undefined,
	lossless: false,
	nearLossless: false,
};

/**
 * Optimizes images, optionally resizing or converting to JPEG, PNG, WebP, or AVIF formats.
 *
 * For best results use a Node.js environment, install the `sharp` module, and
 * provide an encoder. When the encoder is omitted — `sharp` works only in Node.js —
 * the implementation will use a platform-specific fallback encoder, and most
 * quality- and compression-related options are ignored.
 *
 * Example:
 *
 * ```javascript
 * import { textureCompress } from '@gltf-transform/functions';
 * import sharp from 'sharp';
 *
 * // (A) Optimize without conversion.
 * await document.transform(
 * 	textureCompress({encoder: sharp})
 * );
 *
 * // (B) Optimize and convert images to WebP.
 * await document.transform(
 * 	textureCompress({
 * 		encoder: sharp,
 * 		targetFormat: 'webp',
 * 		slots: /^(?!normalTexture).*$/ // exclude normal maps
 * 	})
 * );
 *
 * // (C) Resize and convert images to WebP in a browser, without a Sharp
 * // encoder. Most quality- and compression-related options are ignored.
 * await document.transform(
 * 	textureCompress({ targetFormat: 'webp', resize: [1024, 1024] })
 * );
 * ```
 *
 * @category Transforms
 */
export function textureCompress(_options: TextureCompressOptions): Transform {
	const options = { ...TEXTURE_COMPRESS_DEFAULTS, ..._options } as Required<TextureCompressOptions>;
	const targetFormat = options.targetFormat as Format | undefined;
	const patternRe = options.pattern;
	const formatsRe = options.formats;
	const slotsRe = options.slots;

	return createTransform(NAME, async (document: Document): Promise<void> => {
		const logger = document.getLogger();
		const textures = document.getRoot().listTextures();

		await Promise.all(
			textures.map(async (texture, textureIndex) => {
				const slots = listTextureSlots(texture);
				const channels = getTextureChannelMask(texture);
				const textureLabel =
					texture.getURI() ||
					texture.getName() ||
					`${textureIndex + 1}/${document.getRoot().listTextures().length}`;
				const prefix = `${NAME}(${textureLabel})`;

				// FILTER: Exclude textures that don't match (a) 'slots' or (b) expected formats.

				if (!SUPPORTED_MIME_TYPES.includes(texture.getMimeType())) {
					logger.debug(`${prefix}: Skipping, unsupported texture type "${texture.getMimeType()}".`);
					return;
				} else if (patternRe && !patternRe.test(texture.getName()) && !patternRe.test(texture.getURI())) {
					logger.debug(`${prefix}: Skipping, excluded by "pattern" parameter.`);
					return;
				} else if (formatsRe && !formatsRe.test(texture.getMimeType())) {
					logger.debug(`${prefix}: Skipping, "${texture.getMimeType()}" excluded by "formats" parameter.`);
					return;
				} else if (slotsRe && slots.length && !slots.some((slot) => slotsRe.test(slot))) {
					logger.debug(`${prefix}: Skipping, [${slots.join(', ')}] excluded by "slots" parameter.`);
					return;
				} else if (options.targetFormat === 'jpeg' && channels & TextureChannel.A) {
					logger.warn(`${prefix}: Skipping, [${slots.join(', ')}] requires alpha channel.`);
					return;
				}

				const srcFormat = getFormat(texture);
				const dstFormat = targetFormat || srcFormat;
				logger.debug(`${prefix}: Format = ${srcFormat} → ${dstFormat}`);
				logger.debug(`${prefix}: Slots = [${slots.join(', ')}]`);

				const srcImage = texture.getImage()!;
				const srcByteLength = srcImage.byteLength;

				await compressTexture(texture, options);

				const dstImage = texture.getImage()!;
				const dstByteLength = dstImage.byteLength;

				const flag = srcImage === dstImage ? ' (SKIPPED' : '';

				logger.debug(`${prefix}: Size = ${formatBytes(srcByteLength)} → ${formatBytes(dstByteLength)}${flag}`);
			}),
		);

		// Attach EXT_texture_webp if needed.
		const webpExtension = document.createExtension(EXTTextureWebP);
		if (textures.some((texture) => texture.getMimeType() === 'image/webp')) {
			webpExtension.setRequired(true);
		} else {
			webpExtension.dispose();
		}

		// Attach EXT_texture_avif if needed.
		const avifExtension = document.createExtension(EXTTextureAVIF);
		if (textures.some((texture) => texture.getMimeType() === 'image/avif')) {
			avifExtension.setRequired(true);
		} else {
			avifExtension.dispose();
		}

		logger.debug(`${NAME}: Complete.`);
	});
}

/**
 * Optimizes a single {@link Texture}, optionally resizing or converting to JPEG, PNG, WebP, or AVIF formats.
 *
 * For best results use a Node.js environment, install the `sharp` module, and
 * provide an encoder. When the encoder is omitted — `sharp` works only in Node.js —
 * the implementation will use a platform-specific fallback encoder, and most
 * quality- and compression-related options are ignored.
 *
 * Example:
 *
 * ```javascript
 * import { compressTexture } from '@gltf-transform/functions';
 * import sharp from 'sharp';
 *
 * const texture = document.getRoot().listTextures()
 * 	.find((texture) => texture.getName() === 'MyTexture');
 *
 * // (A) Node.js.
 * await compressTexture(texture, {
 * 	encoder: sharp,
 * 	targetFormat: 'webp',
 * 	resize: [1024, 1024]
 * });
 *
 * // (B) Web.
 * await compressTexture(texture, {
 * 	targetFormat: 'webp',
 * 	resize: [1024, 1024]
 * });
 * ```
 */
export async function compressTexture(texture: Texture, _options: CompressTextureOptions) {
	const options = { ...TEXTURE_COMPRESS_DEFAULTS, ..._options } as Required<CompressTextureOptions>;
	const encoder = options.encoder as typeof sharp | null;

	const srcFormat = getFormat(texture);
	const dstFormat = options.targetFormat || srcFormat;
	const srcMimeType = texture.getMimeType();
	const dstMimeType = `image/${dstFormat}`;

	const srcImage = texture.getImage()!;
	const dstImage = encoder
		? await _encodeWithSharp(srcImage, srcMimeType, dstMimeType, options)
		: await _encodeWithNdarrayPixels(srcImage, srcMimeType, dstMimeType, options);

	const srcByteLength = srcImage.byteLength;
	const dstByteLength = dstImage.byteLength;

	if (srcMimeType === dstMimeType && dstByteLength >= srcByteLength && !options.resize) {
		// Skip if src/dst formats match and dst is larger than the original.
		return;
	} else if (srcMimeType === dstMimeType) {
		// Overwrite if src/dst formats match and dst is smaller than the original.
		texture.setImage(dstImage);
	} else {
		// Overwrite, then update path and MIME type if src/dst formats differ.
		const srcExtension = ImageUtils.mimeTypeToExtension(srcMimeType);
		const dstExtension = ImageUtils.mimeTypeToExtension(dstMimeType);
		const dstURI = texture.getURI().replace(new RegExp(`\\.${srcExtension}$`), `.${dstExtension}`);
		texture.setImage(dstImage).setMimeType(dstMimeType).setURI(dstURI);
	}
}

async function _encodeWithSharp(
	srcImage: Uint8Array,
	_srcMimeType: string,
	dstMimeType: string,
	options: Required<CompressTextureOptions>,
): Promise<Uint8Array> {
	const encoder = options.encoder as typeof sharp;
	let encoderOptions: sharp.JpegOptions | sharp.PngOptions | sharp.WebpOptions | sharp.AvifOptions = {};

	const dstFormat = getFormatFromMimeType(dstMimeType);

	switch (dstFormat) {
		case 'jpeg':
			encoderOptions = { quality: options.quality } as sharp.JpegOptions;
			break;
		case 'png':
			encoderOptions = {
				quality: options.quality,
				effort: remap(options.effort, 100, 10),
			} as sharp.PngOptions;
			break;
		case 'webp':
			encoderOptions = {
				quality: options.quality,
				effort: remap(options.effort, 100, 6),
				lossless: options.lossless,
				nearLossless: options.nearLossless,
			} as sharp.WebpOptions;
			break;
		case 'avif':
			encoderOptions = {
				quality: options.quality,
				effort: remap(options.effort, 100, 9),
				lossless: options.lossless,
			} as sharp.AvifOptions;
			break;
	}

	const instance = encoder(srcImage).toFormat(dstFormat, encoderOptions);

	if (options.resize) {
		instance.resize(options.resize[0], options.resize[1], {
			fit: 'inside',
			kernel: options.resizeFilter,
			withoutEnlargement: true,
		});
	}

	return BufferUtils.toView(await instance.toBuffer());
}

async function _encodeWithNdarrayPixels(
	srcImage: Uint8Array,
	srcMimeType: string,
	dstMimeType: string,
	options: Required<CompressTextureOptions>,
): Promise<Uint8Array> {
	const srcPixels = (await getPixels(srcImage, srcMimeType)) as ndarray.NdArray<Uint8Array>;

	if (options.resize) {
		const [w, h] = srcPixels.shape;
		const dstSize = fitWithin([w, h], options.resize);
		const dstPixels = ndarray(new Uint8Array(dstSize[0] * dstSize[1] * 4), [...dstSize, 4]);
		options.resizeFilter === TextureResizeFilter.LANCZOS3
			? lanczos3(srcPixels, dstPixels)
			: lanczos2(srcPixels, dstPixels);
		return savePixels(dstPixels, dstMimeType);
	}

	return savePixels(srcPixels, dstMimeType);
}

function getFormat(texture: Texture): Format {
	return getFormatFromMimeType(texture.getMimeType());
}

function getFormatFromMimeType(mimeType: string): Format {
	const format = mimeType.split('/').pop() as Format | undefined;
	if (!format || !TEXTURE_COMPRESS_SUPPORTED_FORMATS.includes(format)) {
		throw new Error(`Unknown MIME type "${mimeType}".`);
	}
	return format;
}

function remap(value: number | null | undefined, srcMax: number, dstMax: number): number | undefined {
	if (value == null) return undefined;
	return Math.round((value / srcMax) * dstMax);
}
