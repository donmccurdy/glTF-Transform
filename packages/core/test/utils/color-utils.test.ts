import { deepEqual, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { ColorUtils } from '@gltf-transform/core';

describe('core::ColorUtils', () => {
	test('basic', () => {
		deepEqual(ColorUtils.hexToFactor(0xff0000, []), [1, 0, 0], 'hexToFactor');
		deepEqual(ColorUtils.factorToHex([1, 0, 0]), 16646144, 'factorToHex');

		const linear = ColorUtils.convertSRGBToLinear([0.5, 0.5, 0.5], []);
		strictEqual(linear[0].toFixed(4), '0.2140', 'convertSRGBToLinear[0]');
		strictEqual(linear[1].toFixed(4), '0.2140', 'convertSRGBToLinear[1]');
		strictEqual(linear[2].toFixed(4), '0.2140', 'convertSRGBToLinear[2]');

		const srgb = ColorUtils.convertLinearToSRGB([0.5, 0.5, 0.5], []);
		strictEqual(srgb[0].toFixed(4), '0.7354', 'convertLinearToSRGB[0]');
		strictEqual(srgb[1].toFixed(4), '0.7354', 'convertLinearToSRGB[1]');
		strictEqual(srgb[2].toFixed(4), '0.7354', 'convertLinearToSRGB[2]');
	});
});
