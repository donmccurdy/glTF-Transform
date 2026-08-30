import { strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { FileUtils } from '@gltf-transform/core';

describe('core::FileUtils', () => {
	test('basename', () => {
		strictEqual(FileUtils.basename('http://foo.com/path/to/index.html'), 'index', 'URI');
		strictEqual(FileUtils.basename('http://foo.com/path/to/index.test.suffix.html'), 'index.test.suffix', 'URI');
	});

	test('extension', () => {
		strictEqual(FileUtils.extension('http://foo.com/path/to/index.html'), 'html', 'URI');
		strictEqual(FileUtils.extension('data:image/png;base64,iVBORw0K'), 'png', 'PNG data URI');
		strictEqual(FileUtils.extension('data:image/jpeg;base64,iVBORw0K'), 'jpg', 'JPEG data URI');
		strictEqual(FileUtils.extension('data:application/octet-stream;base64,iVBORw0K'), 'bin', 'binary data URI');
	});
});
