import test from 'ava';
import { MathUtils } from '@gltf-transform/core';

test('identity', (t) => {
	t.is(MathUtils.identity(25), 25, 'identity');
});

test('clamp', (t) => {
	t.is(MathUtils.clamp(0.5, 0, 1), 0.5, 'clamp(0.5, 0, 1) === 0.5');
	t.is(MathUtils.clamp(-0.1, 0, 1), 0, 'clamp(-0.1, 0, 1) === 0.0');
	t.is(MathUtils.clamp(1, 0, 1), 1, 'clamp(1, 0, 1) === 1');
	t.is(MathUtils.clamp(Infinity, 0, 1), 1, 'clamp(Infinity, 0, 1) === 1');
});

test('decodeNormalizedInt', (t) => {
	t.is(MathUtils.decodeNormalizedInt(25, 5126), 25, 'float');
	t.is(MathUtils.decodeNormalizedInt(13107, 5123), 0.2, 'ushort');
	t.is(MathUtils.decodeNormalizedInt(51, 5121), 0.2, 'ubyte');
	t.is(MathUtils.decodeNormalizedInt(1000, 5122).toFixed(4), '0.0305', 'short');
	t.is(MathUtils.decodeNormalizedInt(3, 5120).toFixed(4), '0.0236', 'byte');
});

test('encodeNormalizedInt', (t) => {
	t.is(MathUtils.encodeNormalizedInt(25, 5126), 25, 'float');
	t.is(MathUtils.encodeNormalizedInt(0.2, 5123), 13107, 'ushort');
	t.is(MathUtils.encodeNormalizedInt(0.2, 5121), 51, 'ubyte');
	t.is(MathUtils.encodeNormalizedInt(-0.5, 5121), 0, 'ubyte out of bounds');
	t.is(MathUtils.encodeNormalizedInt(0.03053, 5122), 1000, 'short');
	t.is(MathUtils.encodeNormalizedInt(0.0236, 5120), 3, 'byte');
	t.is(MathUtils.encodeNormalizedInt(1.5, 5120), 127, 'byte out of bounds');
});
