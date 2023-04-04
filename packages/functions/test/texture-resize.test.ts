import path, { dirname } from 'path';
import { getPixels, savePixels } from 'ndarray-pixels';
import test from 'ava';
import { Document } from '@gltf-transform/core';
import { textureResize } from '@gltf-transform/functions';
import ndarray from 'ndarray';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const GRADIENT = getPixels(path.resolve(__dirname, './in/pattern.png'));
const GRADIENT_HALF = getPixels(path.resolve(__dirname, './in/pattern-half.png'));
const NON_SQUARE = ndarray(new Uint8Array(256 * 512 * 4), [256, 512, 4]);

test('square', async (t) => {
	const gradientImage = await savePixels(await GRADIENT, 'image/png');
	const gradientHalfImage = await savePixels(await GRADIENT_HALF, 'image/png');

	const document = new Document();
	const texture = document.createTexture('target').setImage(gradientImage).setMimeType('image/png');

	await document.transform(textureResize({ size: [100, 100], pattern: /other/ }));

	t.is(texture.getImage(), gradientImage, 'no match - pattern');

	await document.transform(textureResize({ size: [100, 100], slots: /NotAMatch/ }));

	t.is(texture.getImage(), gradientImage, 'no match - slots');

	await document.transform(textureResize({ size: [4, 4], pattern: /target/ }));

	t.deepEqual(Array.from(texture.getImage()), Array.from(gradientHalfImage), 'match - resize down');

	await document.transform(textureResize({ size: [2, 4] }));

	t.deepEqual(
		(await getPixels(texture.getImage(), 'image/png')).shape,
		[2, 2, 4],
		'all - resize down with aspect ratio'
	);
});

test('non-square', async (t) => {
	const nonSquareImage = await savePixels(await NON_SQUARE, 'image/png');
	const document = new Document();
	const texture = document.createTexture('target').setImage(nonSquareImage).setMimeType('image/png');

	await document.transform(textureResize({ size: [16, 16] }));

	t.deepEqual((await getPixels(texture.getImage(), 'image/png')).shape, [8, 16, 4], 'maintain aspect ratio');
});
