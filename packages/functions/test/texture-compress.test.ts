import test from 'ava';
import { Document } from '@gltf-transform/core';
import { EXTTextureWebP } from '@gltf-transform/extensions';
import { compressTexture, textureCompress } from '@gltf-transform/functions';
import { logger } from '@gltf-transform/test-utils';
import ndarray from 'ndarray';
import { savePixels } from 'ndarray-pixels';

const ORIGINAL_JPEG = new Uint8Array([1, 2, 3, 4]);
const ORIGINAL_PNG = new Uint8Array([5, 6, 7, 8]);
const ORIGINAL_OTHER = new Uint8Array([9, 10, 11, 12]);
const ORIGINAL_AVIF = new Uint8Array([5, 6]);

const EXPECTED_JPEG = new Uint8Array([101, 102]);
const EXPECTED_PNG = new Uint8Array([103, 104]);
const EXPECTED_WEBP = new Uint8Array([105]);
const EXPECTED_AVIF = new Uint8Array([106, 107, 108]); // larger than original; skipped.

const NON_SQUARE = ndarray(new Uint8Array(256 * 512 * 4), [256, 512, 4]);

test('unknown format', async (t) => {
	const { encoder, calls } = createMockEncoder();
	const document = new Document().setLogger(logger);
	const texture = document.createTexture('Other').setImage(ORIGINAL_OTHER).setMimeType('image/other');
	await document.transform(textureCompress({ encoder, formats: /.*/i, slots: /.*/i }));
	t.deepEqual(calls, [], '0 conversions');
	t.is(texture.getMimeType(), 'image/other', 'unknown mime type unchanged');
	t.is(texture.getImage(), ORIGINAL_OTHER, 'unknown image unchanged');
});

test('incompatible format', async (t) => {
	const { encoder, calls } = createMockEncoder();
	const document = new Document().setLogger(logger);
	const texture = document.createTexture('PNG').setImage(ORIGINAL_PNG).setMimeType('image/png');
	document.createMaterial().setBaseColorTexture(texture).setAlphaMode('BLEND');

	await document.transform(textureCompress({ encoder, targetFormat: 'jpeg', formats: /.*/i, slots: /.*/i }));
	t.deepEqual(calls, [], '0 calls');
	t.is(texture.getMimeType(), 'image/png', 'texture with alpha unchanged');
	t.is(texture.getImage(), ORIGINAL_PNG, 'texture with alpha unchanged');

	await document.transform(textureCompress({ encoder, targetFormat: 'png', formats: /.*/i, slots: /.*/i }));
	t.deepEqual(calls, [['toFormat', ['png', { quality: undefined, effort: undefined }]]], '1 call');
	t.is(texture.getMimeType(), 'image/png', 'texture with alpha optimized');
	t.deepEqual(texture.getImage(), EXPECTED_PNG, 'texture with alpha optimized');
});

test('size increase', async (t) => {
	const { encoder, calls } = createMockEncoder();
	const document = new Document().setLogger(logger);
	const texture = document.createTexture('AVIF').setImage(ORIGINAL_AVIF).setMimeType('image/avif');
	await document.transform(textureCompress({ encoder, formats: /.*/i, slots: /.*/i, targetFormat: 'avif' }));
	t.deepEqual(calls, [['toFormat', ['avif', { quality: undefined, effort: undefined, lossless: false }]]], '1 call');
	t.is(texture.getImage(), ORIGINAL_AVIF, 'file size not increased');
});

test('original formats', async (t) => {
	const { encoder, calls } = createMockEncoder();
	const document = new Document().setLogger(logger);
	const textureJPEG = document.createTexture('JPEG').setImage(ORIGINAL_JPEG).setMimeType('image/jpeg');
	const texturePNG = document.createTexture('PNG').setImage(ORIGINAL_PNG).setMimeType('image/png');

	await document.transform(textureCompress({ encoder }));
	t.deepEqual(
		calls,
		[
			['toFormat', ['jpeg', { quality: undefined }]],
			['toFormat', ['png', { quality: undefined, effort: undefined }]],
		],
		'2 calls',
	);
	t.is(textureJPEG.getMimeType(), 'image/jpeg', 'jpeg mime type unchanged');
	t.is(texturePNG.getMimeType(), 'image/png', 'png mime type unchanged');
	t.deepEqual(textureJPEG.getImage(), EXPECTED_JPEG, 'jpeg optimized');
	t.deepEqual(texturePNG.getImage(), EXPECTED_PNG, 'png optimized');
});

test('excluded slots', async (t) => {
	const { encoder } = createMockEncoder();
	const document = new Document().setLogger(logger);
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

test('jpeg', async (t) => {
	const { encoder, calls } = createMockEncoder();
	const document = new Document().setLogger(logger);
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
	t.deepEqual(
		calls,
		[
			['toFormat', ['jpeg', { quality: undefined }]],
			['toFormat', ['jpeg', { quality: undefined }]],
		],
		'2 calls',
	);
	t.is(textureJPEG.getMimeType(), 'image/jpeg', 'jpeg → image/jpeg');
	t.is(texturePNG.getMimeType(), 'image/jpeg', 'png → image/jpeg');
	t.is(textureJPEG.getURI(), 'baseColor.jpg', '.jpg → .jpg');
	t.is(texturePNG.getURI(), 'normal.jpg', '.png → .jpg');
	t.deepEqual(textureJPEG.getImage(), EXPECTED_JPEG, 'jpeg optimized');
	t.deepEqual(texturePNG.getImage(), EXPECTED_JPEG, 'png optimized');
});

test('jpeg / jpg', async (t) => {
	const { encoder } = createMockEncoder();

	const document = new Document().setLogger(logger);
	const textureJPEG = document.createTexture().setImage(ORIGINAL_JPEG).setMimeType('image/jpeg').setURI('a.jpeg');
	const textureJPG = document.createTexture().setImage(ORIGINAL_JPEG).setMimeType('image/jpeg').setURI('b.jpg');

	await document.transform(textureCompress({ encoder, formats: /.*/i, slots: /.*/i }));

	t.is(textureJPEG.getMimeType(), 'image/jpeg', 'jpeg → image/jpeg');
	t.is(textureJPG.getMimeType(), 'image/jpeg', 'jpg → image/jpeg');
	t.is(textureJPEG.getURI(), 'a.jpeg', '.jpeg → .jpeg');
	t.is(textureJPG.getURI(), 'b.jpg', '.jpg → .jpg');

	await document.transform(textureCompress({ encoder, targetFormat: 'webp', formats: /.*/i, slots: /.*/i }));

	t.is(textureJPEG.getMimeType(), 'image/webp', 'jpeg → image/webp');
	t.is(textureJPG.getMimeType(), 'image/webp', 'jpg → image/webp');
	t.is(textureJPEG.getURI(), 'a.webp', '.jpeg → .webp');
	t.is(textureJPG.getURI(), 'b.webp', '.jpg → .webp');
});

test('png', async (t) => {
	const { encoder, calls } = createMockEncoder();
	const document = new Document().setLogger(logger);
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
	t.deepEqual(
		calls,
		[
			['toFormat', ['png', { quality: undefined, effort: undefined }]],
			['toFormat', ['png', { quality: undefined, effort: undefined }]],
		],
		'2 calls',
	);
	t.is(textureJPEG.getMimeType(), 'image/png', 'jpeg → image/png');
	t.is(texturePNG.getMimeType(), 'image/png', 'png → image/png');
	t.is(textureJPEG.getURI(), 'baseColor.png', '.jpg → .png');
	t.is(texturePNG.getURI(), 'normal.png', '.png → .png');
	t.deepEqual(textureJPEG.getImage(), EXPECTED_PNG, 'jpeg optimized');
	t.deepEqual(texturePNG.getImage(), EXPECTED_PNG, 'png optimized');
});

test('webp', async (t) => {
	const { encoder, calls } = createMockEncoder();
	const document = new Document().setLogger(logger);
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
			['toFormat', ['webp', { quality: undefined, effort: undefined, lossless: false, nearLossless: false }]],
			['toFormat', ['webp', { quality: undefined, effort: undefined, lossless: false, nearLossless: false }]],
		],
		'2 calls',
	);
	t.is(textureJPEG.getMimeType(), 'image/webp', 'jpeg → image/webp');
	t.is(texturePNG.getMimeType(), 'image/webp', 'png → image/webp');
	t.is(textureJPEG.getURI(), 'baseColor.webp', '.jpg → .webp');
	t.is(texturePNG.getURI(), 'normal.webp', '.png → .webp');
	t.deepEqual(textureJPEG.getImage(), EXPECTED_WEBP, 'jpeg optimized');
	t.deepEqual(texturePNG.getImage(), EXPECTED_WEBP, 'png optimized');
});

test('fallback to ndarray-pixels', async (t) => {
	const document = new Document().setLogger(logger);
	document.createExtension(EXTTextureWebP);

	const textureA = document
		.createTexture('JPEG')
		.setImage(await savePixels(NON_SQUARE, 'image/jpeg'))
		.setMimeType('image/jpeg');
	const textureB = document
		.createTexture('PNG')
		.setImage(await savePixels(NON_SQUARE, 'image/png'))
		.setMimeType('image/png');

	await document.transform(textureCompress({ targetFormat: 'webp', resize: [128, 128] }));

	t.is(textureA.getMimeType(), 'image/webp');
	t.is(textureB.getMimeType(), 'image/webp');

	// TODO(cleanup): Not registered automatically without I/O.
	EXTTextureWebP.register();

	t.deepEqual(textureA.getSize(), [64, 128]);
	t.deepEqual(textureB.getSize(), [64, 128]);
});

test('resize - sharp', async (t) => {
	const document = new Document();
	const srcImage = await savePixels(ndarray(new Uint8Array(200 * 350 * 4), [200, 350, 4]), 'image/png');
	const srcTexture = document.createTexture().setImage(srcImage).setMimeType('image/png');

	const dstTextureCeil = srcTexture.clone();
	const dstTextureFloor = srcTexture.clone();
	const dstTextureNearest = srcTexture.clone();
	const dstTexture200x200 = srcTexture.clone();
	const dstTexture1024x1024 = srcTexture.clone();

	const { encoder, calls } = createMockEncoder();

	await compressTexture(dstTextureCeil, { encoder, resize: 'ceil-pot' });
	await compressTexture(dstTextureFloor, { encoder, resize: 'floor-pot' });
	await compressTexture(dstTextureNearest, { encoder, resize: 'nearest-pot' });
	await compressTexture(dstTexture200x200, { encoder, resize: [200, 200] });
	await compressTexture(dstTexture1024x1024, { encoder, resize: [1024, 1024] });

	t.deepEqual(calls[1][1].slice(0, 2), [256, 512], 'ceil - sharp');
	t.deepEqual(calls[3][1].slice(0, 2), [128, 256], 'floor - sharp');
	t.deepEqual(calls[5][1].slice(0, 2), [256, 256], 'nearest - sharp');
	t.deepEqual(calls[7][1].slice(0, 2), [114, 200], '200x200 - sharp');
	t.deepEqual(calls[9][1].slice(0, 2), [200, 350], '1024x1024 - sharp');
});

test('resize - ndarray-pixels', async (t) => {
	const document = new Document();
	const srcImage = await savePixels(ndarray(new Uint8Array(200 * 350 * 4), [200, 350, 4]), 'image/png');
	const srcTexture = document.createTexture().setImage(srcImage).setMimeType('image/png');

	const dstTextureCeil = srcTexture.clone();
	const dstTextureFloor = srcTexture.clone();
	const dstTextureNearest = srcTexture.clone();
	const dstTexture200x200 = srcTexture.clone();
	const dstTexture1024x1024 = srcTexture.clone();

	await compressTexture(dstTextureCeil, { resize: 'ceil-pot' });
	await compressTexture(dstTextureFloor, { resize: 'floor-pot' });
	await compressTexture(dstTextureNearest, { resize: 'nearest-pot' });
	await compressTexture(dstTexture200x200, { resize: [200, 200] });
	await compressTexture(dstTexture1024x1024, { resize: [1024, 1024] });

	t.deepEqual(dstTextureCeil.getSize(), [256, 512], 'ceil - ndarray-pixels');
	t.deepEqual(dstTextureFloor.getSize(), [128, 256], 'floor - ndarray-pixels');
	t.deepEqual(dstTextureNearest.getSize(), [256, 256], 'nearest - ndarray-pixels');
	t.deepEqual(dstTexture200x200.getSize(), [114, 200], '200x200 - ndarray-pixels');
	t.deepEqual(dstTexture1024x1024.getSize(), [200, 350], '1024x1024 - ndarray-pixels');
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
			return this;
		}
		resize(...args) {
			const call = ['resize', args];
			calls.push(call);
			this.calls.push(call);
			return this;
		}
		async toBuffer(): Promise<Uint8Array> {
			if (this.calls.length === 0) {
				switch (this.image) {
					case ORIGINAL_PNG:
						return EXPECTED_PNG;
					case ORIGINAL_JPEG:
						return EXPECTED_JPEG;
					case ORIGINAL_AVIF:
						return EXPECTED_AVIF;
					default:
						throw new Error('Unexpected input image');
				}
			}

			const lastCall = findLast(this.calls, ([name]) => name === 'toFormat');
			const format = lastCall[1][0];
			switch (format) {
				case 'png':
					return EXPECTED_PNG;
				case 'jpeg':
					return EXPECTED_JPEG;
				case 'webp':
					return EXPECTED_WEBP;
				case 'avif':
					return EXPECTED_AVIF;
				default:
					throw new Error(`Unexpected format ${format}`);
			}
		}
	}

	return { encoder, calls };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findLast(calls: any[], fn: (call: any) => boolean): any {
	for (let i = calls.length - 1; i >= 0; i--) {
		if (fn(calls[i])) return calls[i];
	}
}
