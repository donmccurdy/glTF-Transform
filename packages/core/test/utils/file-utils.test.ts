require('source-map-support').install();

import test from 'tape';
import { FileUtils } from '../../';

test('@gltf-transform/core::file-utils | basename', t => {
	t.equals(FileUtils.basename('http://foo.com/path/to/index.html'), 'index', 'URI');
	t.equals(FileUtils.basename('http://foo.com/path/to/index.test.suffix.html'), 'index.test.suffix', 'URI');
	t.end();
});

test('@gltf-transform/core::file-utils | extension', t => {
	t.equals(FileUtils.extension('http://foo.com/path/to/index.html'), 'html', 'URI');
	t.equals(FileUtils.extension('data:image/png;base64,iVBORw0K'), 'png', 'PNG data URI');
	t.equals(FileUtils.extension('data:image/jpeg;base64,iVBORw0K'), 'jpeg', 'JPEG data URI');
	t.equals(
		FileUtils.extension('data:application/octet-stream;base64,iVBORw0K'),
		'bin',
		'binary data URI'
	);
	t.end();
});
