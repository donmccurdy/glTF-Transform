import { strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { MathUtils } from '@gltf-transform/core';

describe('core::MathUtils', () => {
	test('identity', () => {
		strictEqual(MathUtils.identity(25), 25, 'identity');
	});

	test('clamp', () => {
		strictEqual(MathUtils.clamp(0.5, 0, 1), 0.5, 'clamp(0.5, 0, 1) === 0.5');
		strictEqual(MathUtils.clamp(-0.1, 0, 1), 0, 'clamp(-0.1, 0, 1) === 0.0');
		strictEqual(MathUtils.clamp(1, 0, 1), 1, 'clamp(1, 0, 1) === 1');
		strictEqual(MathUtils.clamp(Infinity, 0, 1), 1, 'clamp(Infinity, 0, 1) === 1');
	});

	test('decodeNormalizedInt', () => {
		strictEqual(MathUtils.decodeNormalizedInt(25, 5126), 25, 'float');
		strictEqual(MathUtils.decodeNormalizedInt(13107, 5123), 0.2, 'ushort');
		strictEqual(MathUtils.decodeNormalizedInt(51, 5121), 0.2, 'ubyte');
		strictEqual(MathUtils.decodeNormalizedInt(1000, 5122).toFixed(4), '0.0305', 'short');
		strictEqual(MathUtils.decodeNormalizedInt(3, 5120).toFixed(4), '0.0236', 'byte');
	});

	test('encodeNormalizedInt', () => {
		strictEqual(MathUtils.encodeNormalizedInt(25, 5126), 25, 'float');
		strictEqual(MathUtils.encodeNormalizedInt(0.2, 5123), 13107, 'ushort');
		strictEqual(MathUtils.encodeNormalizedInt(0.2, 5121), 51, 'ubyte');
		strictEqual(MathUtils.encodeNormalizedInt(-0.5, 5121), 0, 'ubyte out of bounds');
		strictEqual(MathUtils.encodeNormalizedInt(0.03053, 5122), 1000, 'short');
		strictEqual(MathUtils.encodeNormalizedInt(0.0236, 5120), 3, 'byte');
		strictEqual(MathUtils.encodeNormalizedInt(1.5, 5120), 127, 'byte out of bounds');
	});
});
