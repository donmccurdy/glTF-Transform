import { strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { BufferUtils } from '@gltf-transform/core';

const IS_NODEJS = typeof window === 'undefined';

const HELLO_WORLD = 'data:application/octet-stream;base64,aGVsbG8gd29ybGQ=';

describe('core::BufferUtils', () => {
	test('web', () => {
		if (IS_NODEJS) return;
		strictEqual(
			BufferUtils.decodeText(BufferUtils.createBufferFromDataURI(HELLO_WORLD)),
			'hello world',
			'createBufferFromDataURI',
		);
		strictEqual(BufferUtils.decodeText(BufferUtils.encodeText('hey')), 'hey', 'encode/decode');
	});

	test('node.js', () => {
		if (!IS_NODEJS) return;
		strictEqual(
			BufferUtils.decodeText(BufferUtils.createBufferFromDataURI(HELLO_WORLD)),
			'hello world',
			'createBufferFromDataURI',
		);
		strictEqual(BufferUtils.decodeText(BufferUtils.encodeText('hey')), 'hey', 'encode/decode');

		const buffer = new Uint8Array([1, 2]);
		strictEqual(BufferUtils.equals(buffer, buffer), true, 'equals strict');
		strictEqual(BufferUtils.equals(buffer, new Uint8Array([1])), false, 'equals by length');
	});
});
