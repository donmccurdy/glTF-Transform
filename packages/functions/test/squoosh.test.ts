require('source-map-support').install();

import test from 'tape';
import { Document, Logger } from '@gltf-transform/core';
import { mozjpeg, oxipng, webp } from '../';
import type * as SquooshLib from '@squoosh/lib';

const ORIGINAL_JPEG = new Uint8Array([101]);
const ORIGINAL_PNG = new Uint8Array([102]);
const ORIGINAL_OTHER = new Uint8Array([103]);

const EXPECTED_JPEG = new Uint8Array([201]);
const EXPECTED_PNG = new Uint8Array([202]);
const EXPECTED_WEBP = new Uint8Array([203]);

const LOGGER = new Logger(Logger.Verbosity.SILENT);

let encodeCalls = { mozjpeg: 0, oxipng: 0, webp: 0 };

test('@gltf-transform/functions::squoosh | unknown format', async (t) => {
	const squoosh = createMockSquoosh();
	const document = new Document().setLogger(LOGGER);
	const texture = document.createTexture('Other').setImage(ORIGINAL_OTHER).setMimeType('image/other');
	await document.transform(mozjpeg({ squoosh, formats: /.*/i, slots: /.*/i }));
	t.deepEquals(encodeCalls, { mozjpeg: 0, oxipng: 0, webp: 0 }, '0 encode calls');
	t.equals(texture.getMimeType(), 'image/other', 'unknown mime type unchanged');
	t.equals(texture.getImage(), ORIGINAL_OTHER, 'unknown image unchanged');
	t.end();
});

test('@gltf-transform/functions::squoosh | incompatible format', async (t) => {
	const squoosh = createMockSquoosh();
	const document = new Document().setLogger(LOGGER);
	const texture = document.createTexture('PNG').setImage(ORIGINAL_PNG).setMimeType('image/png');
	document.createMaterial().setBaseColorTexture(texture).setAlphaMode('BLEND');

	await document.transform(mozjpeg({ squoosh, formats: /.*/i, slots: /.*/i }));
	t.deepEquals(encodeCalls, { mozjpeg: 0, oxipng: 0, webp: 0 }, '0 mozjpeg calls');
	t.equals(texture.getMimeType(), 'image/png', 'texture with alpha unchanged');
	t.equals(texture.getImage(), ORIGINAL_PNG, 'texture with alpha unchanged');

	await document.transform(oxipng({ squoosh, formats: /.*/i, slots: /.*/i }));
	t.deepEquals(encodeCalls, { mozjpeg: 0, oxipng: 1, webp: 0 }, '1 oxipng calls');
	t.equals(texture.getMimeType(), 'image/png', 'texture with alpha optimized');
	t.equals(texture.getImage(), EXPECTED_PNG, 'texture with alpha optimized');
	t.end();
});

test('@gltf-transform/functions::squoosh | excluded formats', async (t) => {
	const squoosh = createMockSquoosh();
	const document = new Document().setLogger(LOGGER);
	const textureJPEG = document.createTexture('JPEG').setImage(ORIGINAL_JPEG).setMimeType('image/jpeg');
	const texturePNG = document.createTexture('PNG').setImage(ORIGINAL_PNG).setMimeType('image/png');

	await document.transform(mozjpeg({ squoosh }));
	t.deepEquals(encodeCalls, { mozjpeg: 1, oxipng: 0, webp: 0 }, '1 mozjpeg call');
	t.equals(textureJPEG.getMimeType(), 'image/jpeg', 'jpeg mime type unchanged');
	t.equals(texturePNG.getMimeType(), 'image/png', 'png mime type unchanged');
	t.equals(textureJPEG.getImage(), EXPECTED_JPEG, 'jpeg optimized');
	t.equals(texturePNG.getImage(), ORIGINAL_PNG, 'png unchanged');

	await document.transform(oxipng({ squoosh }));
	t.deepEquals(encodeCalls, { mozjpeg: 1, oxipng: 1, webp: 0 }, '1 mozjpeg call, 1 oxipng call');
	t.equals(textureJPEG.getMimeType(), 'image/jpeg', 'jpeg mime type unchanged');
	t.equals(texturePNG.getMimeType(), 'image/png', 'png mime type unchanged');
	t.equals(textureJPEG.getImage(), EXPECTED_JPEG, 'jpeg unchanged');
	t.equals(texturePNG.getImage(), EXPECTED_PNG, 'png optimized');
	t.end();
});

test('@gltf-transform/functions::squoosh | excluded slots', async (t) => {
	const squoosh = createMockSquoosh();
	const document = new Document().setLogger(LOGGER);
	const textureJPEG = document.createTexture('JPEG').setImage(ORIGINAL_JPEG).setMimeType('image/jpeg');
	const texturePNG = document.createTexture('PNG').setImage(ORIGINAL_PNG).setMimeType('image/png');
	document.createMaterial().setBaseColorTexture(textureJPEG).setNormalTexture(texturePNG);

	await document.transform(mozjpeg({ squoosh, slots: /^baseColor.*/, formats: /.*/i }));
	t.deepEquals(encodeCalls, { mozjpeg: 1, oxipng: 0, webp: 0 }, '1 mozjpeg call');
	t.equals(textureJPEG.getMimeType(), 'image/jpeg', 'jpeg mime type unchanged');
	t.equals(texturePNG.getMimeType(), 'image/png', 'png mime type unchanged');
	t.equals(textureJPEG.getImage(), EXPECTED_JPEG, 'jpeg optimized');
	t.equals(texturePNG.getImage(), ORIGINAL_PNG, 'png unchanged');

	await document.transform(oxipng({ squoosh, slots: /^normal.*/, formats: /.*/i }));
	t.deepEquals(encodeCalls, { mozjpeg: 1, oxipng: 1, webp: 0 }, '1 mozjpeg call, 1 oxipng call');
	t.equals(textureJPEG.getMimeType(), 'image/jpeg', 'jpeg mime type unchanged');
	t.equals(texturePNG.getMimeType(), 'image/png', 'png mime type unchanged');
	t.equals(textureJPEG.getImage(), EXPECTED_JPEG, 'jpeg unchanged');
	t.equals(texturePNG.getImage(), EXPECTED_PNG, 'png optimized');
	t.end();
});

test('@gltf-transform/functions::squoosh | mozjpeg', async (t) => {
	const squoosh = createMockSquoosh();
	const document = new Document().setLogger(LOGGER);
	const textureJPEG = document.createTexture('JPEG').setImage(ORIGINAL_JPEG).setMimeType('image/jpeg');
	const texturePNG = document.createTexture('PNG').setImage(ORIGINAL_PNG).setMimeType('image/png');
	await document.transform(mozjpeg({ squoosh, formats: /.*/i, slots: /.*/i }));
	t.deepEquals(encodeCalls, { mozjpeg: 2, oxipng: 0, webp: 0 }, '2 mozjpeg calls');
	t.equals(textureJPEG.getMimeType(), 'image/jpeg', 'jpeg → image/jpeg');
	t.equals(texturePNG.getMimeType(), 'image/jpeg', 'png → image/jpeg');
	t.equals(textureJPEG.getImage(), EXPECTED_JPEG, 'jpeg optimized');
	t.equals(texturePNG.getImage(), EXPECTED_JPEG, 'png optimized');
	t.end();
});

test('@gltf-transform/functions::squoosh | oxipng', async (t) => {
	const squoosh = createMockSquoosh();
	const document = new Document().setLogger(LOGGER);
	const textureJPEG = document.createTexture('JPEG').setImage(ORIGINAL_JPEG).setMimeType('image/jpeg');
	const texturePNG = document.createTexture('PNG').setImage(ORIGINAL_PNG).setMimeType('image/png');
	await document.transform(oxipng({ squoosh, formats: /.*/i, slots: /.*/i }));
	t.deepEquals(encodeCalls, { mozjpeg: 0, oxipng: 2, webp: 0 }, '2 oxipng calls');
	t.equals(textureJPEG.getMimeType(), 'image/png', 'jpeg → image/png');
	t.equals(texturePNG.getMimeType(), 'image/png', 'png → image/png');
	t.equals(textureJPEG.getImage(), EXPECTED_PNG, 'jpeg optimized');
	t.equals(texturePNG.getImage(), EXPECTED_PNG, 'png optimized');
	t.end();
});

test('@gltf-transform/functions::squoosh | webp', async (t) => {
	const squoosh = createMockSquoosh();
	const document = new Document().setLogger(LOGGER);
	const textureJPEG = document.createTexture('JPEG').setImage(ORIGINAL_JPEG).setMimeType('image/jpeg');
	const texturePNG = document.createTexture('PNG').setImage(ORIGINAL_PNG).setMimeType('image/png');
	await document.transform(webp({ squoosh, formats: /.*/i, slots: /.*/i }));
	t.deepEquals(encodeCalls, { mozjpeg: 0, oxipng: 0, webp: 2 }, '2 webp calls');
	t.equals(textureJPEG.getMimeType(), 'image/webp', 'jpeg → image/webp');
	t.equals(texturePNG.getMimeType(), 'image/webp', 'png → image/webp');
	t.equals(textureJPEG.getImage(), EXPECTED_WEBP, 'jpeg optimized');
	t.equals(texturePNG.getImage(), EXPECTED_WEBP, 'png optimized');
	t.end();
});

function createMockSquoosh() {
	class MockImagePool {
		ingestImage(image: Uint8Array) {
			return new MockImage(image);
		}
		close() {
			return Promise.resolve();
		}
	}

	class MockImage {
		_image: Uint8Array;
		_preprocessSettings: unknown;
		_encodeSettings: unknown;
		encodedWith: Record<string, Promise<SquooshLib.EncodedImage>> = {
			mozjpeg: Promise.resolve({ binary: EXPECTED_JPEG, optionsUsed: {} }),
			oxipng: Promise.resolve({ binary: EXPECTED_PNG, optionsUsed: {} }),
			webp: Promise.resolve({ binary: EXPECTED_WEBP, optionsUsed: {} }),
		};
		constructor(image: Uint8Array) {
			this._image = image;
		}
		preprocess(settings: Record<string, unknown>) {
			this._preprocessSettings = settings;
			return Promise.resolve();
		}
		encode(settings: Record<string, unknown>) {
			this._encodeSettings = settings;
			if (settings.mozjpeg) encodeCalls.mozjpeg++;
			if (settings.oxipng) encodeCalls.oxipng++;
			if (settings.webp) encodeCalls.webp++;
			return Promise.resolve();
		}
	}

	encodeCalls = { mozjpeg: 0, oxipng: 0, webp: 0 };

	return { ImagePool: MockImagePool };
}
