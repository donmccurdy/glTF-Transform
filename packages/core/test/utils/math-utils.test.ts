require('source-map-support').install();

import test from 'tape';
import { MathUtils } from '../../';

test('@gltf-transform/core::math-utils | identity', t => {
	t.equals(MathUtils.identity(25), 25, 'identity');
	t.end();
});

test('@gltf-transform/core::math-utils | denormalize', t => {
	t.equals(MathUtils.denormalize(25, 5126), 25, 'float');
	t.equals(MathUtils.denormalize(13107, 5123), 0.2, 'ushort');
	t.equals(MathUtils.denormalize(51, 5121), 0.2, 'ubyte');
	t.equals(MathUtils.denormalize(1000, 5122).toFixed(4), '0.0305', 'short');
	t.equals(MathUtils.denormalize(3, 5120).toFixed(4), '0.0236', 'byte');
	t.end();
});

test('@gltf-transform/core::math-utils | normalize', t => {
	t.equals(MathUtils.normalize(25, 5126), 25, 'float');
	t.equals(MathUtils.normalize(0.2, 5123), 13107, 'ushort');
	t.equals(MathUtils.normalize(0.2, 5121), 51, 'ubyte');
	t.equals(MathUtils.normalize(0.03053, 5122), 1000, 'short');
	t.equals(MathUtils.normalize(0.0236, 5120), 3, 'byte');
	t.end();
});
