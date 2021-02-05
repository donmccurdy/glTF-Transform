require('source-map-support').install();

import test from 'tape';
import { ColorUtils } from '../../';

test('@gltf-transform/core::color-utils', t => {
	t.deepEquals(ColorUtils.hexToFactor(0xFF0000, []), [1, 0, 0], 'hexToFactor');
	t.deepEquals(ColorUtils.factorToHex([1, 0, 0]), 16646144, 'factorToHex');

	const linear = ColorUtils.convertSRGBToLinear([.5, .5, .5], []);
	t.equals(linear[0].toFixed(4), '0.2140', 'convertSRGBToLinear[0]');
	t.equals(linear[1].toFixed(4), '0.2140', 'convertSRGBToLinear[1]');
	t.equals(linear[2].toFixed(4), '0.2140', 'convertSRGBToLinear[2]');

	const srgb = ColorUtils.convertLinearToSRGB([.5, .5, .5], []);
	t.equals(srgb[0].toFixed(4), '0.7354', 'convertLinearToSRGB[0]');
	t.equals(srgb[1].toFixed(4), '0.7354', 'convertLinearToSRGB[1]');
	t.equals(srgb[2].toFixed(4), '0.7354', 'convertLinearToSRGB[2]');

	t.end();
});
