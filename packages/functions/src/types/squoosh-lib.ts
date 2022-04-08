/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/prefer-namespace-keyword */

// https://github.com/GoogleChromeLabs/squoosh/issues/1223
export declare module SquooshLib {
	enum Codec {
		OXIPNG = 'oxipng',
		MOZJPEG = 'mozjpeg',
		WEBP = 'webp',
	}

	export class ImagePool {
		constructor(jobs: number);
		ingestImage(image: Uint8Array): Image;
		close(): Promise<void>;
	}

	export class Image {
		preprocess(settings: Record<string, unknown>): Promise<void>;
		encode(settings: Record<string, unknown>): Promise<unknown>;
		encodedWith: Record<Codec, Promise<EncodedImage>>;
	}

	export class EncodedImage {
		optionsUsed: Record<string, unknown>;
		binary: Uint8Array;
	}
}
