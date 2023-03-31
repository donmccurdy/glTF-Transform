import test from 'ava';
import { ColorUtils } from '@gltf-transform/core';

test('basic', (t) => {
	t.deepEqual(ColorUtils.hexToFactor(0xff0000, []), [1, 0, 0], 'hexToFactor');
	t.deepEqual(ColorUtils.factorToHex([1, 0, 0]), 16646144, 'factorToHex');

	const linear = ColorUtils.convertSRGBToLinear([0.5, 0.5, 0.5], []);
	t.is(linear[0].toFixed(4), '0.2140', 'convertSRGBToLinear[0]');
	t.is(linear[1].toFixed(4), '0.2140', 'convertSRGBToLinear[1]');
	t.is(linear[2].toFixed(4), '0.2140', 'convertSRGBToLinear[2]');

	const srgb = ColorUtils.convertLinearToSRGB([0.5, 0.5, 0.5], []);
	t.is(srgb[0].toFixed(4), '0.7354', 'convertLinearToSRGB[0]');
	t.is(srgb[1].toFixed(4), '0.7354', 'convertLinearToSRGB[1]');
	t.is(srgb[2].toFixed(4), '0.7354', 'convertLinearToSRGB[2]');
});
