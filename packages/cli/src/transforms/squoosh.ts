import { ImagePool } from '@squoosh/lib';
import { Document, Transform } from '@gltf-transform/core';
import { TextureWebP } from '@gltf-transform/extensions';
import { formatBytes } from '../util';

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

export interface SquooshOptions {
	formats?: string;
	slots?: string;
	autoRounds?: number;
	autoTarget?: number;
}

interface SquooshInternalOptions extends SquooshOptions {
	codec: Codec;
}

const SQUOOSH_DEFAULTS: Required<SquooshInternalOptions> = {
	formats: '*',
	slots: '*',
	autoRounds: 6,
	autoTarget: 1.4,
	codec: Codec.OXIPNG,
};

const WEBP_DEFAULTS: SquooshOptions = { ...SQUOOSH_DEFAULTS };
const MOZJPEG_DEFAULTS: SquooshOptions = { ...SQUOOSH_DEFAULTS, formats: 'jpeg' };
const OXIPNG_DEFAULTS: SquooshOptions = { ...SQUOOSH_DEFAULTS, formats: 'png' };

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

export const squoosh = function (options: SquooshInternalOptions = SQUOOSH_DEFAULTS): Transform {
	options = { ...SQUOOSH_DEFAULTS, ...options };

	return async (document: Document): Promise<void> => {
		const logger = document.getLogger();
		const textures = document.getRoot().listTextures();
		const pool = requestImagePool();

		await Promise.all(
			textures.map(async (texture) => {
				if (!SUPPORTED_MIME_TYPES.includes(texture.getMimeType())) return;

				const image = pool.ingestImage(texture.getImage()!);
				const srcByteLength = texture.getImage()!.byteLength;

				await image.encode({ [options.codec]: {} });

				const encodedImage = await image.encodedWith[options.codec];

				// TODO(impl): Better printed output, similar to toktx.

				logger.debug(`${NAME}: ${JSON.stringify(encodedImage.optionsUsed)}`);

				texture.setImage(encodedImage.binary).setMimeType(CODEC_TO_MIME_TYPE[options.codec]);

				logger.debug(`${NAME}: ${formatBytes(srcByteLength)} → ${formatBytes(encodedImage.binary.byteLength)}`);
			})
		);

		releaseImagePool();

		logger.debug(`${NAME}: Complete.`);
	};
};

export const webp = function (options: SquooshOptions = WEBP_DEFAULTS): Transform {
	options = { ...WEBP_DEFAULTS, ...options };
	return (document: Document): void => {
		document.createExtension(TextureWebP).setRequired(true);
		return squoosh({ formats: options.formats, slots: options.slots, codec: Codec.WEBP })(document);
	};
};

export const mozjpeg = function (options: SquooshOptions = MOZJPEG_DEFAULTS): Transform {
	options = { ...MOZJPEG_DEFAULTS, ...options };
	return (document: Document): void => {
		return squoosh({ formats: options.formats, slots: options.slots, codec: Codec.MOZJPEG })(document);
	};
};

export const oxipng = function (options: SquooshOptions = OXIPNG_DEFAULTS): Transform {
	options = { ...OXIPNG_DEFAULTS, ...options };
	return (document: Document): void => {
		return squoosh({ formats: options.formats, slots: options.slots, codec: Codec.OXIPNG })(document);
	};
};
