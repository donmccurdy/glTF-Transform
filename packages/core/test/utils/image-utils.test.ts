import { BufferUtils, ImageUtils } from '@gltf-transform/core';
import test from 'ava';
import fs from 'fs';
import ndarray from 'ndarray';
import { savePixels } from 'ndarray-pixels';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('basic', async (t) => {
	let pixels = ndarray(new Uint8Array(100 * 50 * 4), [100, 50, 4]);
	let image = await savePixels(pixels, 'image/png');
	t.deepEqual(ImageUtils.getSize(image, 'image/png'), [100, 50], 'gets PNG size');

	pixels = ndarray(new Uint8Array(16 * 32 * 4), [16, 32, 4]);
	image = await savePixels(pixels, 'image/jpeg');
	t.deepEqual(ImageUtils.getSize(image, 'image/jpeg'), [16, 32], 'gets JPEG size');
});

test('png', (t) => {
	const png = fs.readFileSync(path.join(__dirname, '..', 'in', 'test.png'));
	const fried = BufferUtils.concat([
		new Uint8Array(12),
		BufferUtils.encodeText('CgBI'),
		new Uint8Array(16),
		new Uint8Array(8),
	]);
	const friedView = new DataView(fried.buffer, fried.byteOffset);
	friedView.setUint32(32, 12, false);
	friedView.setUint32(36, 12, false);

	t.is(ImageUtils.getMimeType(png), 'image/png', 'detects image/png');
	t.deepEqual(ImageUtils.getSize(png, 'image/png'), [256, 256], 'png');
	t.deepEqual(ImageUtils.getSize(fried, 'image/png'), [12, 12], 'png (fried)');
	t.is(ImageUtils.getChannels(png, 'image/png'), 4, 'png channels');
	t.is(ImageUtils.getChannels(fried, 'image/png'), 4, 'png channels');
	t.is(ImageUtils.getVRAMByteLength(png, 'image/png'), 349524, 'png gpu size');
	t.is(ImageUtils.getVRAMByteLength(fried, 'image/png'), 760, 'png gpu size');
});

test('jpeg', (t) => {
	const jpg = fs.readFileSync(path.join(__dirname, '..', 'in', 'test.jpg'));
	const array = new Uint8Array(100);
	const view = new DataView(array.buffer, array.byteOffset);

	t.is(ImageUtils.getMimeType(jpg), 'image/jpeg', 'detects image/jpeg');
	t.deepEqual(ImageUtils.getSize(jpg, 'image/jpeg'), [256, 256], 'jpg size');
	t.is(ImageUtils.getChannels(jpg, 'image/jpeg'), 3, 'jpg channels');
	// See https://github.com/donmccurdy/glTF-Transform/issues/151.
	t.is(ImageUtils.getVRAMByteLength(jpg, 'image/jpeg'), 349524, 'jpg gpu size');

	view.setUint16(4, 1000, false);
	t.throws(() => ImageUtils.getSize(array, 'image/jpeg'), undefined, 'oob');

	view.setUint16(4, 12, false);
	t.throws(() => ImageUtils.getSize(array, 'image/jpeg'), undefined, 'invalid');

	view.setUint16(4, 94, false);
	view.setUint8(94 + 4, 0xff);
	t.throws(() => ImageUtils.getSize(array, 'image/jpeg'), undefined, 'no size');
});

test('extensions', (t) => {
	t.is(ImageUtils.extensionToMimeType('jpg'), 'image/jpeg', 'extensionToMimeType, jpeg');
	t.is(ImageUtils.mimeTypeToExtension('image/png'), 'png', 'mimeTypeToExtension, inferred');
	t.is(ImageUtils.mimeTypeToExtension('image/jpeg'), 'jpg', 'mimeTypeToExtension, jpg');
});
