require('source-map-support').install();

import path from 'path';
import test from 'tape';
import { Logger, NodeIO } from '@gltf-transform/core';
import { inspect } from '../';

test('@gltf-transform/lib::inspect', t => {

	const io = new NodeIO();
	const doc = io.read(path.join(__dirname, 'in/TwoCubes.glb'))
		.setLogger(new Logger(Logger.Verbosity.SILENT));

	doc.createAnimation('TestAnim');
	doc.createTexture('TestTex')
		.setImage(new ArrayBuffer(10))
		.setMimeType('image/fake');

	const report = inspect(doc);

	t.ok(report, 'report');
	t.equal(report.scenes.properties.length, 1, 'report.scenes');
	t.equal(report.meshes.properties.length, 2, 'report.meshes');
	t.equal(report.materials.properties.length, 2, 'report.materials');
	t.equal(report.animations.properties.length, 1, 'report.animations');
	t.equal(report.textures.properties.length, 1, 'report.textures');
	t.end();
});
