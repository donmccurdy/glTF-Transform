import { Document, TextureChannel, Transform } from '@gltf-transform/core';
import { TextureWebP } from '@gltf-transform/extensions';
import { getTextureChannelMask } from './list-texture-channels';
import { listTextureSlots } from './list-texture-slots';
import type { SquooshLib } from './types/squoosh-lib';
import { formatBytes } from './utils';

const NAME = 'squoosh';

enum Codec {
	OXIPNG = 'oxipng',
	MOZJPEG = 'mozjpeg',
	WEBP = 'webp',
}

const CODEC_TO_MIME_TYPE: Record<Codec, string> = {
	[Codec.OXIPNG]: 'image/png',
	[Codec.MOZJPEG]: 'image/jpeg',
	[Codec.WEBP]: 'image/webp',
};

// TODO(feat): There are _many_ other encoder options for each of the
// codecs provided here, but the options are mostly undocumented. If
// anyone is willing to contribute documentation on what the options
// are, I'm happy to expose more here.
// See: https://github.com/GoogleChromeLabs/squoosh/blob/dev/libsquoosh/src/codecs.ts
export interface SquooshOptions {
	squoosh: unknown;
	formats?: RegExp;
	slots?: RegExp;
	auto?: boolean;
}

interface SquooshInternalOptions extends SquooshOptions {
	codec: Codec;
}

const SQUOOSH_DEFAULTS: Required<Omit<Omit<SquooshInternalOptions, 'codec'>, 'squoosh'>> = {
	formats: /.*/,
	slots: /.*/,
	auto: false,
};

const WEBP_DEFAULTS: Omit<SquooshInternalOptions, 'squoosh'> = {
	...SQUOOSH_DEFAULTS,
	codec: Codec.WEBP,
};
const MOZJPEG_DEFAULTS: Omit<SquooshInternalOptions, 'squoosh'> = {
	...SQUOOSH_DEFAULTS,
	codec: Codec.MOZJPEG,
	formats: /^image\/jpeg$/,
};
const OXIPNG_DEFAULTS: Omit<SquooshInternalOptions, 'squoosh'> = {
	...SQUOOSH_DEFAULTS,
	codec: Codec.OXIPNG,
	formats: /^image\/png$/,
};

const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

let pool: SquooshLib.ImagePool | null = null;
let poolUsers = 0;

const requestImagePool = (squoosh: typeof SquooshLib): SquooshLib.ImagePool => {
	if (!pool) {
		pool = new squoosh.ImagePool(require('os').cpus().length);
	}
	poolUsers++;
	return pool!;
};

const releaseImagePool = (): void => {
	if (--poolUsers === 0) {
		pool!.close(); // Required for process to exit.
	}
};

/** @internal Shared base for {@link webp()}, {@link mozjpeg()}, and {@link oxipng()}. */
export const squoosh = function (_options: SquooshInternalOptions): Transform {
	const options = { ...SQUOOSH_DEFAULTS, ..._options } as Required<SquooshInternalOptions>;
	const squoosh = options.squoosh as typeof SquooshLib | null;

	if (!squoosh) {
		throw new Error(`${NAME}: squoosh dependency required — install "@squoosh/lib".`);
	}

	return async (document: Document): Promise<void> => {
		const logger = document.getLogger();
		const textures = document.getRoot().listTextures();
		const pool = requestImagePool(squoosh);

		await Promise.all(
			textures.map(async (texture, textureIndex) => {
				const slots = listTextureSlots(document, texture);
				const channels = getTextureChannelMask(document, texture);
				const textureLabel =
					texture.getURI() ||
					texture.getName() ||
					`${textureIndex + 1}/${document.getRoot().listTextures().length}`;
				const prefix = `${NAME}:texture(${textureLabel})`;

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
				} else if (options.codec === Codec.MOZJPEG && channels & TextureChannel.A) {
					logger.warn(`${prefix}: Skipping, [${slots.join(', ')}] requires alpha channel.`);
					return;
				}

				logger.debug(`${prefix}: Slots → [${slots.join(', ')}]`);

				// COMPRESS: Run `squoosh/lib` library.

				const image = pool.ingestImage(texture.getImage()!);
				const srcByteLength = texture.getImage()!.byteLength;

				await image.encode({ [options.codec]: options.auto ? 'auto' : {} });

				const encodedImage = await image.encodedWith[options.codec];

				logger.debug(`${prefix}: ${JSON.stringify(encodedImage.optionsUsed)}`);

				texture.setImage(encodedImage.binary).setMimeType(CODEC_TO_MIME_TYPE[options.codec]);
				const dstByteLength = encodedImage.binary.byteLength;

				logger.debug(`${prefix}: ${formatBytes(srcByteLength)} → ${formatBytes(dstByteLength)}`);
			})
		);

		releaseImagePool();

		logger.debug(`${NAME}: Complete.`);
	};
};

/**
 * Converts images to WebP, using the {@link TextureWebP} extension.
 *
 * Requires `@squoosh/lib`, and currently works only in Node.js
 * environments. Support for encoding in web browsers may be available pending
 * [GoogleChromeLabs/squoosh#1084](https://github.com/GoogleChromeLabs/squoosh/issues/1084).
 *
 * Example:
 *
 * ```javascript
 * import * as squoosh from '@squoosh/lib';
 * import { webp } from '@gltf-transform/functions';
 *
 * await document.transform(
 * 	webp({ squoosh, auto: false })
 * );
 * ```
 */
export const webp = function (options: SquooshOptions): Transform {
	const _options = { ...WEBP_DEFAULTS, ...options } as SquooshInternalOptions;
	return (document: Document): void => {
		document.createExtension(TextureWebP).setRequired(true);
		return squoosh(_options)(document);
	};
};

/**
 * Optimizes JPEG images by default, optionally converting PNG textures to JPEG.
 *
 * Requires `@squoosh/lib`, and currently works only in Node.js
 * environments. Support for encoding in web browsers may be available pending
 * [GoogleChromeLabs/squoosh#1084](https://github.com/GoogleChromeLabs/squoosh/issues/1084).
 *
 * Example:
 *
 * ```javascript
 * import * as squoosh from '@squoosh/lib';
 * import { mozjpeg } from '@gltf-transform/functions';
 *
 * await document.transform(
 * 	mozjpeg({ squoosh, auto: false })
 * );
 * ```
 */
export const mozjpeg = function (options: SquooshOptions): Transform {
	const _options = { ...MOZJPEG_DEFAULTS, ...options } as SquooshInternalOptions;
	return (document: Document): void => {
		return squoosh(_options)(document);
	};
};

/**
 * Optimizes PNG images by default, optionally converting JPEG textures to PNG.
 *
 * Requires `@squoosh/lib`, and currently works only in Node.js
 * environments. Support for encoding in web browsers may be available pending
 * [GoogleChromeLabs/squoosh#1084](https://github.com/GoogleChromeLabs/squoosh/issues/1084).
 *
 * Example:
 *
 * ```javascript
 * import * as squoosh from '@squoosh/lib';
 * import { oxipng } from '@gltf-transform/functions';
 *
 * await document.transform(
 * 	oxipng({ squoosh, auto: false })
 * );
 * ```
 */
export const oxipng = function (options: SquooshOptions): Transform {
	const _options = { ...OXIPNG_DEFAULTS, ...options } as SquooshInternalOptions;
	return (document: Document): void => {
		return squoosh(_options)(document);
	};
};
