require('source-map-support').install();

import test from 'tape';
import { NodeIO } from '../../';

test('@gltf-transform/core::io | common', t => {
	t.throws(() => new NodeIO().readJSON({
		json: {asset: {version: '1.0'}},
		resources: {},
	}), '1.0');
	t.end();
});
