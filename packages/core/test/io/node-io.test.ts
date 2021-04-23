require('source-map-support').install();

const IS_NODEJS = typeof window === 'undefined';

import test from 'tape';
import { NodeIO } from '../../';

let fs, glob, path;
if (IS_NODEJS) {
	fs = require('fs');
	glob = require('glob');
	path = require('path');
}

function ensureDir(uri) {
	const outdir = path.dirname(uri);
	if (!fs.existsSync(outdir)) fs.mkdirSync(outdir);
}

test('@gltf-transform/core::io | node.js read glb', {skip: !IS_NODEJS}, t => {
	glob.sync(path.join(__dirname, 'in', '**/*.glb')).forEach((inputURI) => {
		const basepath = inputURI.replace(path.join(__dirname, 'in'), '');

		const io = new NodeIO();
		const doc = io.read(inputURI);

		t.ok(doc, `Read "${basepath}".`);
	});
	t.end();
});

test('@gltf-transform/core::io | node.js read gltf', {skip: !IS_NODEJS}, t => {
	glob.sync(path.join(__dirname, 'in', '**/*.gltf')).forEach((inputURI) => {
		const basepath = inputURI.replace(path.join(__dirname, 'in'), '');

		const io = new NodeIO();
		const doc = io.read(inputURI);

		t.ok(doc, `Read "${basepath}".`);
	});
	t.end();
});

test('@gltf-transform/core::io | node.js write glb', {skip: !IS_NODEJS}, t => {
	glob.sync(path.join(__dirname, 'in', '**/*.gltf')).forEach((inputURI) => {
		const basepath = inputURI.replace(path.join(__dirname, 'in'), '');
		const outputURI = path.join(__dirname, 'out', basepath);

		const io = new NodeIO();
		const doc = io.read(inputURI);

		ensureDir(outputURI);
		io.write(outputURI.replace('.gltf', '.glb'), doc);
		t.ok(true, `Wrote "${basepath}".`); // TODO(cleanup): Test the output somehow.
	});
	t.end();
});

test('@gltf-transform/core::io | node.js write gltf', {skip: !IS_NODEJS}, t => {
	glob.sync(path.join(__dirname, 'in', '**/*.glb')).forEach((inputURI) => {
		const basepath = inputURI.replace(path.join(__dirname, 'in'), '');
		const outputURI = path.join(__dirname, 'out', basepath);

		const io = new NodeIO();
		const doc = io.read(inputURI);

		ensureDir(outputURI);
		io.write(outputURI.replace('.glb', '.gltf'), doc);
		t.ok(true, `Wrote "${basepath}".`); // TODO(cleanup): Test the output somehow.
	});
	t.end();
});

