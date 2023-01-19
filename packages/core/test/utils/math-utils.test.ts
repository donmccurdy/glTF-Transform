import test from 'tape';
import { MathUtils } from '@gltf-transform/core';

test('@gltf-transform/core::math-utils | identity', (t) => {
	t.equals(MathUtils.identity(25), 25, 'identity');
	t.end();
});

test('@gltf-transform/core::math-utils | decodeNormalizedInt', (t) => {
	t.equals(MathUtils.decodeNormalizedInt(25, 5126), 25, 'float');
	t.equals(MathUtils.decodeNormalizedInt(13107, 5123), 0.2, 'ushort');
	t.equals(MathUtils.decodeNormalizedInt(51, 5121), 0.2, 'ubyte');
	t.equals(MathUtils.decodeNormalizedInt(1000, 5122).toFixed(4), '0.0305', 'short');
	t.equals(MathUtils.decodeNormalizedInt(3, 5120).toFixed(4), '0.0236', 'byte');
	t.end();
});

test('@gltf-transform/core::math-utils | encodeNormalizedInt', (t) => {
	t.equals(MathUtils.encodeNormalizedInt(25, 5126), 25, 'float');
	t.equals(MathUtils.encodeNormalizedInt(0.2, 5123), 13107, 'ushort');
	t.equals(MathUtils.encodeNormalizedInt(0.2, 5121), 51, 'ubyte');
	t.equals(MathUtils.encodeNormalizedInt(0.03053, 5122), 1000, 'short');
	t.equals(MathUtils.encodeNormalizedInt(0.0236, 5120), 3, 'byte');
	t.end();
});
