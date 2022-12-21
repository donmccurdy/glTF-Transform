import { BufferUtils, Document, TextureChannel, Transform } from '@gltf-transform/core';
import { TextureWebP } from '@gltf-transform/extensions';
import { getTextureChannelMask } from './list-texture-channels';
import { listTextureSlots } from './list-texture-slots';
import type sharp from 'sharp';
import { formatBytes } from './utils';

const CODECS = ['jpeg', 'png', 'webp'] as const;
const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface TextureCompressOptions {
	encoder: unknown;
	codec?: typeof CODECS[number];
	formats?: RegExp;
	slots?: RegExp;
}

export const TEXTURE_COMPRESS_DEFAULTS: Required<Omit<Omit<TextureCompressOptions, 'encoder'>, 'codec'>> = {
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
	const codec = options.codec;

	if (!encoder) {
		throw new Error(`${codec}: encoder dependency required — install "sharp".`);
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
				const prefix = `${codec}:texture(${textureLabel})`;

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
				} else if (options.codec === 'jpeg' && channels & TextureChannel.A) {
					logger.warn(`${prefix}: Skipping, [${slots.join(', ')}] requires alpha channel.`);
					return;
				}

				logger.debug(`${prefix}: Slots → [${slots.join(', ')}]`);

				// COMPRESS: Run compression library.

				const srcImage = texture.getImage()!;
				const srcByteLength = srcImage.byteLength;

				const instance = encoder(srcImage);
				if (codec) instance.toFormat(codec);

				const dstImage = BufferUtils.toView(await instance.toBuffer());
				texture.setImage(dstImage).setMimeType(`image/${codec}`);
				const dstByteLength = dstImage.byteLength;

				logger.debug(`${prefix}: ${formatBytes(srcByteLength)} → ${formatBytes(dstByteLength)}`);
			})
		);

		// Attach EXT_texture_web if needed.
		if (textures.some((texture) => texture.getMimeType() === 'image/webp')) {
			document.createExtension(TextureWebP).setRequired(true);
		}

		logger.debug(`${codec}: Complete.`);
	};
};
