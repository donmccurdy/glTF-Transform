require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');

const { Logger, NodeIO } = require ('@gltf-transform/core');
const { inspect } = require('../');

test('@gltf-transform/lib::inspect', t => {

	const io = new NodeIO(fs, path);
	const doc = io.read(path.join(__dirname, 'in/TwoCubes.glb'))
		.setLogger(new Logger(Logger.Verbosity.SILENT));

	doc.createAnimation('TestAnim');
	doc.createTexture('TestTex')
		.setImage(new ArrayBuffer(10));

	const report = inspect(doc);

	t.ok(report, 'report');
	t.equal(report.scenes.properties.length, 1, 'report.scenes');
	t.equal(report.meshes.properties.length, 2, 'report.meshes');
	t.equal(report.materials.properties.length, 2, 'report.materials');
	t.equal(report.animations.properties.length, 1, 'report.animations');
	t.equal(report.textures.properties.length, 1, 'report.textures');
	t.end();
});
