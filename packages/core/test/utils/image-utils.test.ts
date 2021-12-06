require('source-map-support').install();

const IS_NODEJS = typeof window === 'undefined';

import { createCanvas } from 'canvas';
import test from 'tape';
import { BufferUtils, ImageUtils } from '../../';

let fs, path;
if (IS_NODEJS) {
	fs = require('fs');
	path = require('path');
}

// TODO(https://github.com/Automattic/node-canvas/issues/1923)
test.skip('@gltf-transform/core::image-utils | basic', { skip: !IS_NODEJS }, (t) => {
	let canvas, ctx, buffer;

	canvas = createCanvas(100, 50);
	ctx = canvas.getContext('2d');
	ctx.fillStyle = '#222222';
	buffer = canvas.toBuffer('image/png');
	t.deepEquals(ImageUtils.getSize(buffer, 'image/png'), [100, 50], 'gets PNG size');

	canvas = createCanvas(16, 32);
	ctx = canvas.getContext('2d');
	ctx.fillStyle = '#222222';
	buffer = canvas.toBuffer('image/jpeg');
	t.deepEquals(ImageUtils.getSize(buffer, 'image/jpeg'), [16, 32], 'gets JPEG size');

	t.end();
});

test('@gltf-transform/core::image-utils | png', { skip: !IS_NODEJS }, (t) => {
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

	t.equals(ImageUtils.getMimeType(png), 'image/png', 'detects image/png');
	t.deepEquals(ImageUtils.getSize(png, 'image/png'), [256, 256], 'png');
	t.deepEquals(ImageUtils.getSize(fried, 'image/png'), [12, 12], 'png (fried)');
	t.equals(ImageUtils.getChannels(png, 'image/png'), 4, 'png channels');
	t.equals(ImageUtils.getChannels(fried, 'image/png'), 4, 'png channels');
	t.equals(ImageUtils.getMemSize(png, 'image/png'), 349524, 'png gpu size');
	t.equals(ImageUtils.getMemSize(fried, 'image/png'), 760, 'png gpu size');
	t.end();
});

test('@gltf-transform/core::image-utils | jpeg', { skip: !IS_NODEJS }, (t) => {
	const jpg = fs.readFileSync(path.join(__dirname, '..', 'in', 'test.jpg'));
	const array = new Uint8Array(100);
	const view = new DataView(array.buffer, array.byteOffset);

	t.equals(ImageUtils.getMimeType(jpg), 'image/jpeg', 'detects image/jpeg');
	t.deepEquals(ImageUtils.getSize(jpg, 'image/jpeg'), [256, 256], 'jpg size');
	t.equals(ImageUtils.getChannels(jpg, 'image/jpeg'), 3, 'jpg channels');
	// See https://github.com/donmccurdy/glTF-Transform/issues/151.
	t.equals(ImageUtils.getMemSize(jpg, 'image/jpeg'), 349524, 'jpg gpu size');

	view.setUint16(4, 1000, false);
	t.throws(() => ImageUtils.getSize(array, 'image/jpeg'), 'oob');

	view.setUint16(4, 12, false);
	t.throws(() => ImageUtils.getSize(array, 'image/jpeg'), 'invalid');

	view.setUint16(4, 94, false);
	view.setUint8(94 + 4, 0xff);
	t.throws(() => ImageUtils.getSize(array, 'image/jpeg'), 'no size');

	t.end();
});

test('@gltf-transform/core::image-utils | extensions', (t) => {
	t.equals(ImageUtils.extensionToMimeType('jpg'), 'image/jpeg', 'extensionToMimeType, jpeg');
	t.equals(ImageUtils.mimeTypeToExtension('image/png'), 'png', 'mimeTypeToExtension, inferred');
	t.equals(ImageUtils.mimeTypeToExtension('image/jpeg'), 'jpg', 'mimeTypeToExtension, jpg');
	t.end();
});
