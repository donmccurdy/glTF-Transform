import test from 'ava';
import { FileUtils } from '@gltf-transform/core';

test('basename', (t) => {
	t.is(FileUtils.basename('http://foo.com/path/to/index.html'), 'index', 'URI');
	t.is(FileUtils.basename('http://foo.com/path/to/index.test.suffix.html'), 'index.test.suffix', 'URI');
});

test('extension', (t) => {
	t.is(FileUtils.extension('http://foo.com/path/to/index.html'), 'html', 'URI');
	t.is(FileUtils.extension('data:image/png;base64,iVBORw0K'), 'png', 'PNG data URI');
	t.is(FileUtils.extension('data:image/jpeg;base64,iVBORw0K'), 'jpg', 'JPEG data URI');
	t.is(FileUtils.extension('data:application/octet-stream;base64,iVBORw0K'), 'bin', 'binary data URI');
});
