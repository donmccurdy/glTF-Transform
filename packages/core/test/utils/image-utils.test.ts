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

test('@gltf-transform/core::image-utils | basic', {skip: !IS_NODEJS}, t => {
	let canvas, ctx, buffer;

	canvas = createCanvas(100, 50);
	ctx = canvas.getContext('2d');
	ctx.fillStyle = '#222222';
	buffer = BufferUtils.trim(canvas.toBuffer('image/png'));
	t.deepEquals(ImageUtils.getSize(buffer, 'image/png'), [100, 50], 'gets PNG size');

	canvas = createCanvas(16, 32);
	ctx = canvas.getContext('2d');
	ctx.fillStyle = '#222222';
	buffer = BufferUtils.trim(canvas.toBuffer('image/jpeg'));
	t.deepEquals(ImageUtils.getSize(buffer, 'image/jpeg'), [16, 32], 'gets JPEG size');

	t.end();
});

test('@gltf-transform/core::image-utils | png', {skip: !IS_NODEJS}, t => {
	const png = BufferUtils.trim(fs.readFileSync(path.join(__dirname, '..', 'in', 'test.png')));
	const fried = BufferUtils.concat([
		new ArrayBuffer(12),
		BufferUtils.encodeText('CgBI'),
		new ArrayBuffer(16),
		new ArrayBuffer(8),
	]);
	const friedView = new DataView(fried);
	friedView.setUint32(32, 12, false);
	friedView.setUint32(36, 12, false);

	t.deepEquals(ImageUtils.getSize(png, 'image/png'), [256, 256], 'png');
	t.deepEquals(ImageUtils.getSize(fried, 'image/png'), [12, 12], 'png (fried)');
	t.equals(ImageUtils.getChannels(png, 'image/png'), 4, 'png channels');
	t.equals(ImageUtils.getChannels(fried, 'image/png'), 4, 'png channels');
	t.equals(ImageUtils.getMemSize(png, 'image/png'), 349524, 'png gpu size');
	t.equals(ImageUtils.getMemSize(fried, 'image/png'), 760, 'png gpu size');
	t.end();
});

test('@gltf-transform/core::image-utils | jpeg', {skip: !IS_NODEJS}, t => {
	const jpg = BufferUtils.trim(fs.readFileSync(path.join(__dirname, '..', 'in', 'test.jpg')));
	const buffer = new ArrayBuffer(100);
	const view = new DataView(buffer);

	t.deepEquals(ImageUtils.getSize(jpg, 'image/jpeg'), [256, 256], 'jpg size');
	t.equals(ImageUtils.getChannels(jpg, 'image/jpeg'), 3, 'jpg channels');
	// See https://github.com/donmccurdy/glTF-Transform/issues/151.
	t.equals(ImageUtils.getMemSize(jpg, 'image/jpeg'), 349524, 'jpg gpu size');

	view.setUint16(4, 1000, false);
	t.throws(() => ImageUtils.getSize(buffer, 'image/jpeg'), 'oob');

	view.setUint16(4, 12, false);
	t.throws(() => ImageUtils.getSize(buffer, 'image/jpeg'), 'invalid');

	view.setUint16(4, 94, false);
	view.setUint8(94 + 4, 0xFF);
	t.throws(() => ImageUtils.getSize(buffer, 'image/jpeg'), 'no size');

	t.end();
});

test('@gltf-transform/core::image-utils | webp', {skip: !IS_NODEJS}, t => {
	const webpLossy =
		BufferUtils.trim(fs.readFileSync(path.join(__dirname, '..', 'in', 'test-lossy.webp')));
	const webpLossless =
		BufferUtils.trim(fs.readFileSync(path.join(__dirname, '..', 'in', 'test-lossless.webp')));
	const buffer = BufferUtils.concat([
		BufferUtils.encodeText('RIFF'),
		new ArrayBuffer(4),
		BufferUtils.encodeText('WEBP'),
		BufferUtils.encodeText('OTHR'),
		new Uint8Array([999, 0, 0, 0]),
	]);

	t.equals(ImageUtils.getSize(new ArrayBuffer(8), 'image/webp'), null, 'invalid');
	t.equals(ImageUtils.getSize(buffer, 'image/webp'), null, 'no size');
	t.deepEquals(ImageUtils.getSize(webpLossy, 'image/webp'), [256, 256], 'size (lossy)');
	t.deepEquals(ImageUtils.getSize(webpLossless, 'image/webp'), [256, 256], 'size (lossless)');
	t.equals(ImageUtils.getChannels(webpLossy, 'image/webp'), 4, 'channels');
	t.equals(ImageUtils.getChannels(webpLossless, 'image/fake'), null, 'channels (other)');
	t.equals(ImageUtils.getMemSize(webpLossy, 'image/webp'), 349524, 'gpuSize');
	t.end();
});

test('@gltf-transform/core::image-utils | ktx2', {skip: !IS_NODEJS}, t => {
	const ktx2 = BufferUtils.trim(fs.readFileSync(path.join(__dirname, '..', 'in', 'test.ktx2')));

	t.throws(() => ImageUtils.getSize(new ArrayBuffer(10), 'image/ktx2'), 'corrupt file');
	t.deepEquals(ImageUtils.getSize(ktx2, 'image/ktx2'), [256, 256], 'size');
	t.equals(ImageUtils.getChannels(ktx2, 'image/ktx2'), 3, 'channels');
	t.equals(ImageUtils.getMemSize(ktx2, 'image/ktx2'), 65536, 'gpuSize');
	t.end();
});

test('@gltf-transform/core::image-utils | extensions', t => {
	t.equals(ImageUtils.extensionToMimeType('ktx2'), 'image/ktx2', 'extensionToMimeType, inferred');
	t.equals(ImageUtils.extensionToMimeType('jpg'), 'image/jpeg', 'extensionToMimeType, jpeg');
	t.equals(ImageUtils.mimeTypeToExtension('image/png'), 'png', 'mimeTypeToExtension, inferred');
	t.equals(ImageUtils.mimeTypeToExtension('image/jpeg'), 'jpg', 'mimeTypeToExtension, jpg');
	t.end();
});
