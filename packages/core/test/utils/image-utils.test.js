require('source-map-support').install();

const IS_NODEJS = typeof window === 'undefined';

const test = require('tape');
const { createCanvas } = require('canvas');
const { ImageUtils, BufferUtils } = require('../../');

test('@gltf-transform/core::image-utils', {skip: !IS_NODEJS}, t => {
	let canvas, ctx, buffer;

	canvas = createCanvas(100, 50);
	ctx = canvas.getContext("2d");
	ctx.fillStyle = "#222222";
	buffer = canvas.toBuffer("image/png");
	t.deepEquals(ImageUtils.getSizePNG(BufferUtils.trim(buffer)), [100, 50], 'gets PNG size');

	canvas = createCanvas(16, 32);
	ctx = canvas.getContext("2d");
	ctx.fillStyle = "#222222";
	buffer = canvas.toBuffer("image/jpeg");
	t.deepEquals(ImageUtils.getSizeJPEG(BufferUtils.trim(buffer)), [16, 32], 'gets JPEG size');

	t.end();
});
