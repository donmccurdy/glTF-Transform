import { BufferUtils, Document, ImageUtils, Texture, TextureChannel, Transform, vec2 } from '@gltf-transform/core';
import { EXTTextureAVIF, EXTTextureWebP } from '@gltf-transform/extensions';
import { getTextureChannelMask } from './list-texture-channels.js';
import { listTextureSlots } from './list-texture-slots.js';
import type sharp from 'sharp';
import { createTransform, formatBytes } from './utils.js';
import { TextureResizeFilter } from './texture-resize.js';

const NAME = 'textureCompress';

type Format = (typeof FORMATS)[number];
const FORMATS = ['jpeg', 'png', 'webp', 'avif'] as const;
const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export interface TextureCompressOptions {
	/** Instance of the Sharp encoder, which must be installed from the
	 * 'sharp' package and provided by the caller.
	 */
	encoder: unknown;
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
	/** Pattern matching the format(s) to be compressed or converted. */
	formats?: RegExp | null;
	/** Pattern matching the material texture slot(s) to be compressed or converted. */
	slots?: RegExp | null;

	/** Quality, 1-100. Default: auto. */
	quality?: number | null;
	/** Level of CPU effort to reduce file size, 0-100. PNG, WebP, and AVIF only. Default: auto. */
	effort?: number | null;
	/** Use lossless compression mode. WebP and AVIF only. Default: false. */
	lossless?: boolean;
	/** Use near lossless compression mode. WebP only. Default: false. */
	nearLossless?: boolean;
}

export type CompressTextureOptions = Omit<TextureCompressOptions, 'pattern' | 'formats' | 'slots'>;

export const TEXTURE_COMPRESS_DEFAULTS: Required<Omit<TextureCompressOptions, 'resize' | 'targetFormat' | 'encoder'>> =
	{
		resizeFilter: TextureResizeFilter.LANCZOS3,
		pattern: null,
		formats: null,
		slots: null,
		quality: null,
		effort: null,
		lossless: false,
		nearLossless: false,
	};

/**
 * Optimizes images, optionally resizing or converting to JPEG, PNG, WebP, or AVIF formats.
 *
 * Requires `sharp`, and is available only in Node.js environments.
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
 * ```
 *
 * @category Transforms
 */
export function textureCompress(_options: TextureCompressOptions): Transform {
	const options = { ...TEXTURE_COMPRESS_DEFAULTS, ..._options } as Required<TextureCompressOptions>;
	const encoder = options.encoder as typeof sharp | null;
	const targetFormat = options.targetFormat as Format | undefined;
	const patternRe = options.pattern;
	const formatsRe = options.formats;
	const slotsRe = options.slots;

	if (!encoder) {
		throw new Error(`${targetFormat}: encoder dependency required — install "sharp".`);
	}

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
			})
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
 * Requires `sharp`, and is available only in Node.js environments.
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
 * await compressTexture(texture, {
 * 	encoder: sharp,
 * 	targetFormat: 'webp',
 * 	resize: [1024, 1024]
 * });
 * ```
 */
export async function compressTexture(texture: Texture, _options: CompressTextureOptions) {
	const options = { ...TEXTURE_COMPRESS_DEFAULTS, ..._options } as Required<CompressTextureOptions>;
	const encoder = options.encoder as typeof sharp | null;

	if (!encoder) {
		throw new Error(`${options.targetFormat}: encoder dependency required — install "sharp".`);
	}

	const srcFormat = getFormat(texture);
	const dstFormat = options.targetFormat || srcFormat;
	const srcMimeType = texture.getMimeType();
	const dstMimeType = `image/${dstFormat}`;

	let encoderOptions: sharp.JpegOptions | sharp.PngOptions | sharp.WebpOptions | sharp.AvifOptions = {};

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

	const srcImage = texture.getImage()!;
	const instance = encoder(srcImage).toFormat(dstFormat, encoderOptions);

	// Resize.
	if (options.resize) {
		instance.resize(options.resize[0], options.resize[1], {
			fit: 'inside',
			kernel: options.resizeFilter,
			withoutEnlargement: true,
		});
	}

	const dstImage = BufferUtils.toView(await instance.toBuffer());

	const srcByteLength = srcImage.byteLength;
	const dstByteLength = dstImage.byteLength;

	if (srcMimeType === dstMimeType && dstByteLength >= srcByteLength) {
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

function getFormat(texture: Texture): Format {
	const mimeType = texture.getMimeType();
	const format = mimeType.split('/').pop() as Format | undefined;
	if (!format || !FORMATS.includes(format)) {
		throw new Error(`Unknown MIME type "${mimeType}".`);
	}
	return format;
}

function remap(value: number | null | undefined, srcMax: number, dstMax: number): number | null {
	if (value == null) return null;
	return Math.round((value / srcMax) * dstMax);
}
