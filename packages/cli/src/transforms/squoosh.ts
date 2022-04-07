import { ImagePool } from '@squoosh/lib';
import { Document, TextureChannel, Transform } from '@gltf-transform/core';
import { TextureWebP } from '@gltf-transform/extensions';
import { formatBytes, getTextureChannels, getTextureSlots } from '../util';

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
	formats?: RegExp;
	slots?: RegExp;
	auto?: boolean;
}

interface SquooshInternalOptions extends SquooshOptions {
	codec: Codec;
}

const SQUOOSH_DEFAULTS: Required<Omit<SquooshInternalOptions, 'codec'>> = {
	formats: /.*/,
	slots: /.*/,
	auto: false,
};

const WEBP_DEFAULTS: SquooshInternalOptions = {
	...SQUOOSH_DEFAULTS,
	codec: Codec.WEBP,
};
const MOZJPEG_DEFAULTS: SquooshInternalOptions = {
	...SQUOOSH_DEFAULTS,
	codec: Codec.MOZJPEG,
	formats: /^image\/jpeg$/,
};
const OXIPNG_DEFAULTS: SquooshInternalOptions = {
	...SQUOOSH_DEFAULTS,
	codec: Codec.OXIPNG,
	formats: /^image\/png$/,
};

const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface ImagePool {
	ingestImage(image: Uint8Array): Image;
	close(): Promise<void>;
}

interface Image {
	preprocess(settings: Record<string, unknown>): Promise<void>;
	encode(settings: Record<string, unknown>): Promise<unknown>;
	encodedWith: Record<Codec, Promise<EncodedImage>>;
}

interface EncodedImage {
	optionsUsed: Record<string, unknown>;
	binary: Uint8Array;
}

let pool: ImagePool | null = null;
let poolUsers = 0;

const requestImagePool = (): ImagePool => {
	if (!pool) {
		pool = new ImagePool(require('os').cpus().length);
	}
	poolUsers++;
	return pool!;
};

const releaseImagePool = (): void => {
	if (--poolUsers === 0) {
		pool!.close(); // Required for process to exit.
	}
};

export const squoosh = function (_options: SquooshInternalOptions): Transform {
	const options = { ...SQUOOSH_DEFAULTS, ..._options } as Required<SquooshInternalOptions>;

	return async (document: Document): Promise<void> => {
		const logger = document.getLogger();
		const textures = document.getRoot().listTextures();
		const pool = requestImagePool();

		await Promise.all(
			textures.map(async (texture, textureIndex) => {
				const slots = getTextureSlots(document, texture);
				const channels = getTextureChannels(document, texture);
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

export const webp = function (options: SquooshOptions = WEBP_DEFAULTS): Transform {
	const _options = { ...WEBP_DEFAULTS, ...options } as SquooshInternalOptions;
	return (document: Document): void => {
		document.createExtension(TextureWebP).setRequired(true);
		return squoosh(_options)(document);
	};
};

export const mozjpeg = function (options: SquooshOptions = MOZJPEG_DEFAULTS): Transform {
	const _options = { ...MOZJPEG_DEFAULTS, ...options } as SquooshInternalOptions;
	return (document: Document): void => {
		return squoosh(_options)(document);
	};
};

export const oxipng = function (options: SquooshOptions = OXIPNG_DEFAULTS): Transform {
	const _options = { ...OXIPNG_DEFAULTS, ...options } as SquooshInternalOptions;
	return (document: Document): void => {
		return squoosh(_options)(document);
	};
};
