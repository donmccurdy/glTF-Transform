require('source-map-support').install();

import path from 'path';
import ndarray from 'ndarray';
import { getPixels, savePixels } from 'ndarray-pixels';
import test from 'tape';
import { Document } from '@gltf-transform/core';
import { textureResize } from '../';

const GRADIENT = getPixels(path.resolve(__dirname, './in/pattern.png'));
const GRADIENT_HALF = getPixels(path.resolve(__dirname, './in/pattern-half.png'));

test('@gltf-transform/functions::textureResize', async t => {
	const gradientImage = (await savePixels(await GRADIENT, 'image/png')).buffer;
	const gradientHalfImage = (await savePixels(await GRADIENT_HALF, 'image/png')).buffer;

	const document = new Document();
	const texture = document.createTexture('target')
		.setImage(gradientImage)
		.setMimeType('image/png');

	await document.transform(textureResize({size: [100, 100], pattern: /other/}));

	t.equal(texture.getImage(), gradientImage, 'no match');

	await document.transform(textureResize({size: [4, 4], pattern: /target/}));

	t.deepEqual(
		Array.from(new Uint8Array(texture.getImage())),
		Array.from(new Uint8Array(gradientHalfImage)),
		'match - resize down'
	);

	await document.transform(textureResize({size: [8, 8]}));

	t.deepEqual(
		(await getPixels(new Uint8Array(texture.getImage()), 'image/png')).shape,
		[8, 8, 4],
		'all - resize up'
	);

	t.end();
});
