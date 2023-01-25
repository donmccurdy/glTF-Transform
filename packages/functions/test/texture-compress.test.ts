import test from 'ava';
import { Document, Logger } from '@gltf-transform/core';
import { textureCompress } from '@gltf-transform/functions';

const ORIGINAL_JPEG = new Uint8Array([101]);
const ORIGINAL_PNG = new Uint8Array([102]);
const ORIGINAL_OTHER = new Uint8Array([103]);

const EXPECTED_JPEG = new Uint8Array([201]);
const EXPECTED_PNG = new Uint8Array([202]);
const EXPECTED_WEBP = new Uint8Array([203]);

const LOGGER = new Logger(Logger.Verbosity.SILENT);

test('@gltf-transform/functions::textureCompress | unknown format', async (t) => {
	const { encoder, calls } = createMockEncoder();
	const document = new Document().setLogger(LOGGER);
	const texture = document.createTexture('Other').setImage(ORIGINAL_OTHER).setMimeType('image/other');
	await document.transform(textureCompress({ encoder, formats: /.*/i, slots: /.*/i }));
	t.deepEqual(calls, [], '0 conversions');
	t.is(texture.getMimeType(), 'image/other', 'unknown mime type unchanged');
	t.is(texture.getImage(), ORIGINAL_OTHER, 'unknown image unchanged');
});

test('@gltf-transform/functions::textureCompress | incompatible format', async (t) => {
	const { encoder, calls } = createMockEncoder();
	const document = new Document().setLogger(LOGGER);
	const texture = document.createTexture('PNG').setImage(ORIGINAL_PNG).setMimeType('image/png');
	document.createMaterial().setBaseColorTexture(texture).setAlphaMode('BLEND');

	await document.transform(textureCompress({ encoder, targetFormat: 'jpeg', formats: /.*/i, slots: /.*/i }));
	t.deepEqual(calls, [], '0 conversions');
	t.is(texture.getMimeType(), 'image/png', 'texture with alpha unchanged');
	t.is(texture.getImage(), ORIGINAL_PNG, 'texture with alpha unchanged');

	await document.transform(textureCompress({ encoder, targetFormat: 'png', formats: /.*/i, slots: /.*/i }));
	t.deepEqual(calls, [], '0 conversions');
	t.is(texture.getMimeType(), 'image/png', 'texture with alpha optimized');
	t.deepEqual(texture.getImage(), EXPECTED_PNG, 'texture with alpha optimized');
});

test('@gltf-transform/functions::textureCompress | original formats', async (t) => {
	const { encoder, calls } = createMockEncoder();
	const document = new Document().setLogger(LOGGER);
	const textureJPEG = document.createTexture('JPEG').setImage(ORIGINAL_JPEG).setMimeType('image/jpeg');
	const texturePNG = document.createTexture('PNG').setImage(ORIGINAL_PNG).setMimeType('image/png');

	await document.transform(textureCompress({ encoder }));
	t.deepEqual(calls, [], '0 conversions');
	t.is(textureJPEG.getMimeType(), 'image/jpeg', 'jpeg mime type unchanged');
	t.is(texturePNG.getMimeType(), 'image/png', 'png mime type unchanged');
	t.deepEqual(textureJPEG.getImage(), EXPECTED_JPEG, 'jpeg optimized');
	t.deepEqual(texturePNG.getImage(), EXPECTED_PNG, 'png optimized');
});

test('@gltf-transform/functions::textureCompress | excluded slots', async (t) => {
	const { encoder } = createMockEncoder();
	const document = new Document().setLogger(LOGGER);
	const textureJPEG = document.createTexture('JPEG').setImage(ORIGINAL_JPEG).setMimeType('image/jpeg');
	const texturePNG = document.createTexture('PNG').setImage(ORIGINAL_PNG).setMimeType('image/png');
	document.createMaterial().setBaseColorTexture(textureJPEG).setNormalTexture(texturePNG);

	await document.transform(textureCompress({ encoder, slots: /^baseColor.*/, formats: /.*/i }));
	t.is(textureJPEG.getMimeType(), 'image/jpeg', 'jpeg mime type unchanged');
	t.is(texturePNG.getMimeType(), 'image/png', 'png mime type unchanged');
	t.deepEqual(textureJPEG.getImage(), EXPECTED_JPEG, 'jpeg optimized');
	t.deepEqual(texturePNG.getImage(), ORIGINAL_PNG, 'png unchanged');

	await document.transform(textureCompress({ encoder, slots: /^normal.*/, formats: /.*/i }));
	t.is(textureJPEG.getMimeType(), 'image/jpeg', 'jpeg mime type unchanged');
	t.is(texturePNG.getMimeType(), 'image/png', 'png mime type unchanged');
	t.deepEqual(textureJPEG.getImage(), EXPECTED_JPEG, 'jpeg unchanged');
	t.deepEqual(texturePNG.getImage(), EXPECTED_PNG, 'png optimized');
});

test('@gltf-transform/functions::textureCompress | jpeg', async (t) => {
	const { encoder, calls } = createMockEncoder();
	const document = new Document().setLogger(LOGGER);
	const textureJPEG = document
		.createTexture('JPEG')
		.setImage(ORIGINAL_JPEG)
		.setMimeType('image/jpeg')
		.setURI('baseColor.jpg');
	const texturePNG = document
		.createTexture('PNG')
		.setImage(ORIGINAL_PNG)
		.setMimeType('image/png')
		.setURI('normal.png');
	await document.transform(textureCompress({ encoder, targetFormat: 'jpeg', formats: /.*/i, slots: /.*/i }));
	t.deepEqual(calls, [['toFormat', ['jpeg']]], '1 conversion');
	t.is(textureJPEG.getMimeType(), 'image/jpeg', 'jpeg → image/jpeg');
	t.is(texturePNG.getMimeType(), 'image/jpeg', 'png → image/jpeg');
	t.is(textureJPEG.getURI(), 'baseColor.jpg', '.jpg → .jpg');
	t.is(texturePNG.getURI(), 'normal.jpg', '.png → .jpg');
	t.deepEqual(textureJPEG.getImage(), EXPECTED_JPEG, 'jpeg optimized');
	t.deepEqual(texturePNG.getImage(), EXPECTED_JPEG, 'png optimized');
});

test('@gltf-transform/functions::textureCompress | png', async (t) => {
	const { encoder, calls } = createMockEncoder();
	const document = new Document().setLogger(LOGGER);
	const textureJPEG = document
		.createTexture('JPEG')
		.setImage(ORIGINAL_JPEG)
		.setMimeType('image/jpeg')
		.setURI('baseColor.jpg');
	const texturePNG = document
		.createTexture('PNG')
		.setImage(ORIGINAL_PNG)
		.setMimeType('image/png')
		.setURI('normal.png');
	await document.transform(textureCompress({ encoder, targetFormat: 'png', formats: /.*/i, slots: /.*/i }));
	t.deepEqual(calls, [['toFormat', ['png']]], '1 conversion');
	t.is(textureJPEG.getMimeType(), 'image/png', 'jpeg → image/png');
	t.is(texturePNG.getMimeType(), 'image/png', 'png → image/png');
	t.is(textureJPEG.getURI(), 'baseColor.png', '.jpg → .png');
	t.is(texturePNG.getURI(), 'normal.png', '.png → .png');
	t.deepEqual(textureJPEG.getImage(), EXPECTED_PNG, 'jpeg optimized');
	t.deepEqual(texturePNG.getImage(), EXPECTED_PNG, 'png optimized');
});

test('@gltf-transform/functions::textureCompress | webp', async (t) => {
	const { encoder, calls } = createMockEncoder();
	const document = new Document().setLogger(LOGGER);
	const textureJPEG = document
		.createTexture('JPEG')
		.setImage(ORIGINAL_JPEG)
		.setMimeType('image/jpeg')
		.setURI('baseColor.jpg');
	const texturePNG = document
		.createTexture('PNG')
		.setImage(ORIGINAL_PNG)
		.setMimeType('image/png')
		.setURI('normal.png');
	await document.transform(textureCompress({ encoder, targetFormat: 'webp', formats: /.*/i, slots: /.*/i }));
	t.deepEqual(
		calls,
		[
			['toFormat', ['webp']],
			['toFormat', ['webp']],
		],
		'2 conversions'
	);
	t.is(textureJPEG.getMimeType(), 'image/webp', 'jpeg → image/webp');
	t.is(texturePNG.getMimeType(), 'image/webp', 'png → image/webp');
	t.is(textureJPEG.getURI(), 'baseColor.webp', '.jpg → .webp');
	t.is(texturePNG.getURI(), 'normal.webp', '.png → .webp');
	t.deepEqual(textureJPEG.getImage(), EXPECTED_WEBP, 'jpeg optimized');
	t.deepEqual(texturePNG.getImage(), EXPECTED_WEBP, 'png optimized');
});

function createMockEncoder() {
	const calls = [];

	function encoder(image: Uint8Array) {
		return new MockEncoder(image);
	}

	class MockEncoder {
		public image: Uint8Array;
		public calls = [];
		constructor(image: Uint8Array) {
			this.image = image;
		}
		toFormat(...args) {
			const call = ['toFormat', args];
			calls.push(call);
			this.calls.push(call);
		}
		async toBuffer(): Promise<Uint8Array> {
			if (this.calls.length === 0) {
				switch (this.image) {
					case ORIGINAL_PNG:
						return EXPECTED_PNG;
					case ORIGINAL_JPEG:
						return EXPECTED_JPEG;
					default:
						throw new Error('Unexpected input image');
				}
			}

			const lastCall = this.calls[this.calls.length - 1];
			const format = lastCall[1][0];
			switch (format) {
				case 'png':
					return EXPECTED_PNG;
				case 'jpeg':
					return EXPECTED_JPEG;
				case 'webp':
					return EXPECTED_WEBP;
				default:
					throw new Error(`Unexpected format ${format}`);
			}
		}
	}

	return { encoder, calls };
}
