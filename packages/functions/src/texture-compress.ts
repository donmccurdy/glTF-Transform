import { BufferUtils, Document, ImageUtils, Texture, TextureChannel, Transform } from '@gltf-transform/core';
import { TextureWebP } from '@gltf-transform/extensions';
import { getTextureChannelMask } from './list-texture-channels';
import { listTextureSlots } from './list-texture-slots';
import type sharp from 'sharp';
import { formatBytes } from './utils';

const NAME = 'textureCompress';

type Format = typeof FORMATS[number];
const FORMATS = ['jpeg', 'png', 'webp'] as const;
const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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
	/** Pattern matching the format(s) to be compressed or converted. Default: /.*\/. */
	formats?: RegExp;
	/** Pattern matching the material texture slot(s) to be compressed or converted. Default: /.*\/. */
	slots?: RegExp;
}

export const TEXTURE_COMPRESS_DEFAULTS: Required<Omit<Omit<TextureCompressOptions, 'encoder'>, 'targetFormat'>> = {
	formats: /.*/,
	slots: /.*/,
};

/**
 * Optimizes images, optionally converting to JPEG, PNG, or WebP formats.
 *
 * Requires `sharp`, and is available only in Node.js environments.
 *
 * Example:
 *
 * ```javascript
 * import sharp from 'sharp';
 * import { textureCompress } from '@gltf-transform/functions';
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
 * 		codec: 'webp',
 * 		formats: /.*\/
 * 	})
 * );
 * ```
 */
export const textureCompress = function (_options: TextureCompressOptions): Transform {
	const options = { ...TEXTURE_COMPRESS_DEFAULTS, ..._options } as Required<TextureCompressOptions>;
	const encoder = options.encoder as typeof sharp | null;
	const targetFormat = options.targetFormat as Format | undefined;

	if (!encoder) {
		throw new Error(`${targetFormat}: encoder dependency required — install "sharp".`);
	}

	return async (document: Document): Promise<void> => {
		const logger = document.getLogger();
		const textures = document.getRoot().listTextures();

		await Promise.all(
			textures.map(async (texture, textureIndex) => {
				const slots = listTextureSlots(document, texture);
				const channels = getTextureChannelMask(document, texture);
				const textureLabel =
					texture.getURI() ||
					texture.getName() ||
					`${textureIndex + 1}/${document.getRoot().listTextures().length}`;
				const prefix = `${NAME}(${textureLabel})`;

				// FILTER: Exclude textures that don't match (a) 'slots' or (b) expected formats.

				if (!SUPPORTED_MIME_TYPES.includes(texture.getMimeType())) {
					logger.debug(`${prefix}: Skipping, unsupported texture type "${texture.getMimeType()}".`);
					return;
				} else if (!options.formats.test(texture.getMimeType())) {
					logger.debug(`${prefix}: Skipping, "${texture.getMimeType()}" excluded by "formats" parameter.`);
					return;
				} else if (slots.length && !slots.some((slot) => options.slots.test(slot))) {
					logger.debug(`${prefix}: Skipping, [${slots.join(', ')}] excluded by "slots" parameter.`);
					return;
				} else if (options.targetFormat === 'jpeg' && channels & TextureChannel.A) {
					logger.warn(`${prefix}: Skipping, [${slots.join(', ')}] requires alpha channel.`);
					return;
				}

				const srcFormat = getFormat(texture);
				const dstFormat = targetFormat || srcFormat;
				const srcMimeType = texture.getMimeType();
				const dstMimeType = `image/${dstFormat}`;

				logger.debug(`${prefix}: Format = ${srcFormat} → ${dstFormat}`);
				logger.debug(`${prefix}: Slots = [${slots.join(', ')}]`);

				// COMPRESS: Run compression library.

				const srcImage = texture.getImage()!;
				const instance = encoder(srcImage);

				// Convert if target and source formats differ.
				if (srcMimeType !== dstMimeType) {
					instance.toFormat(dstFormat);
				}

				const dstImage = BufferUtils.toView(await instance.toBuffer());
				texture.setImage(dstImage);

				// Update path and MIME type if target and source formats differ.
				if (srcMimeType !== dstMimeType) {
					const srcExtension = ImageUtils.mimeTypeToExtension(srcMimeType);
					const dstExtension = ImageUtils.mimeTypeToExtension(dstMimeType);
					const dstURI = texture.getURI().replace(new RegExp(`\\.${srcExtension}$`), `.${dstExtension}`);
					texture.setMimeType(dstMimeType).setURI(dstURI);
				}

				const srcByteLength = srcImage.byteLength;
				const dstByteLength = dstImage.byteLength;
				logger.debug(`${prefix}: Size = ${formatBytes(srcByteLength)} → ${formatBytes(dstByteLength)}`);
			})
		);

		// Attach EXT_texture_web if needed.
		if (textures.some((texture) => texture.getMimeType() === 'image/webp')) {
			document.createExtension(TextureWebP).setRequired(true);
		}

		logger.debug(`${NAME}: Complete.`);
	};
};

function getFormat(texture: Texture): Format {
	const mimeType = texture.getMimeType();
	const format = mimeType.split('/').pop() as Format | undefined;
	if (!format || !FORMATS.includes(format)) {
		throw new Error(`Unknown MIME type "${mimeType}".`);
	}
	return format;
}
