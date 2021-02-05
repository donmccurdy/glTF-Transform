require('source-map-support').install();

import test from 'tape';
import { BufferUtils } from '../../';

const IS_NODEJS = typeof window === 'undefined';

const HELLO_WORLD = 'data:application/octet-stream;base64,aGVsbG8gd29ybGQ=';

test('@gltf-transform/core::buffer-utils | web', {skip: IS_NODEJS}, t => {
	t.equals(
		BufferUtils.decodeText(BufferUtils.createBufferFromDataURI(HELLO_WORLD)),
		'hello world',
		'createBufferFromDataURI'
	);
	t.equals(BufferUtils.decodeText(BufferUtils.encodeText('hey')), 'hey', 'encode/decode');
	t.end();
});

test('@gltf-transform/core::buffer-utils | node.js', {skip: !IS_NODEJS}, t => {
	t.equals(
		BufferUtils.decodeText(BufferUtils.createBufferFromDataURI(HELLO_WORLD)),
		'hello world',
		'createBufferFromDataURI'
	);
	t.equals(BufferUtils.decodeText(BufferUtils.encodeText('hey')), 'hey', 'encode/decode');

	const buffer = Buffer.from([1, 2]);
	t.equals(BufferUtils.equals(buffer, buffer), true, 'equals strict');
	t.equals(BufferUtils.equals(buffer, Buffer.from([1])), false, 'equals by length');
	t.end();
});
