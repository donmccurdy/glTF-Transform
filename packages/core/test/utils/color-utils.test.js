require('source-map-support').install();

const test = require('tape');
const { ColorUtils } = require('../../');

test('@gltf-transform/core::color-utils', t => {
	t.deepEquals(ColorUtils.hexToFactor(0xFF0000, []), [1, 0, 0], 'hexToFactor');
	t.deepEquals(ColorUtils.factorToHex([1, 0, 0]), 16646144, 'factorToHex');
	t.deepEquals(
		ColorUtils.convertSRGBToLinear([.5, .5, .5], []),
		[0.2140411404715882, 0.2140411404715882, 0.2140411404715882],
		'convertSRGBToLinear'
	);
	t.deepEquals(
		ColorUtils.convertLinearToSRGB([.5, .5, .5], []),
		[0.7353606352856507, 0.7353606352856507, 0.7353606352856507],
		'convertLinearToSRGB'
	);
	t.end();
});
