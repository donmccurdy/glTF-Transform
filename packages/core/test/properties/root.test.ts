require('source-map-support').install();

import * as test from 'tape';
import { Document } from '../../';

test('@gltf-transform/core::root | copy', t => {
	const doc = new Document();
	const buffer = doc.createBuffer();
	const node = doc.createNode();
	const scene = doc.createScene();

	t.deepEqual(doc.getRoot().listBuffers(), [buffer], 'listBuffers()');
	t.deepEqual(doc.getRoot().listNodes(), [node], 'listNodes()');
	t.deepEqual(doc.getRoot().listScenes(), [scene], 'listScenes()');
	t.end();
});
