import test from 'tape';
import { environment, Environment } from '../../../test-utils';
import { NodeIO } from '@gltf-transform/core';

let fs, glob, path, server, ip;
if (environment === Environment.NODE) {
	fs = require('fs');
	glob = require('glob');
	path = require('path');
	ip = require("ip").address() + ':' + 8989;
	const http = require('http');

	server = http.createServer((req, res) => {
		const filePath = path.join(path.join(__dirname, '../in'), req.url);
		const file = fs.readFileSync(filePath, 'utf-8');
		res.write(file);
		res.end();
	});
	
	server.listen(8989);
}

function ensureDir(uri) {
	const outdir = path.dirname(uri);
	if (!fs.existsSync(outdir)) fs.mkdirSync(outdir);
}

test('@gltf-transform/core::io | node.js read glb', { skip: environment !== Environment.NODE }, async (t) => {
	let count = 0;
	glob.sync(path.join(__dirname, '../in/**/*.glb')).forEach((inputURI) => {
		const basepath = inputURI.replace(path.join(__dirname, '../in'), '.');

		const io = new NodeIO();
		const doc = io.read(inputURI);

		t.ok(doc, `Read "${basepath}".`);
		count++;
	});
	t.ok(count > 0, 'tests completed');
	t.end();
});

test('@gltf-transform/core::io | node.js read gltf', { skip: environment !== Environment.NODE }, async (t) => {
	let count = 0;
	glob.sync(path.join(__dirname, '../in/**/*.gltf')).forEach((inputURI) => {
		const basepath = inputURI.replace(path.join(__dirname, '../in'), '.');

		const io = new NodeIO();
		const doc = io.read(inputURI);

		t.ok(doc, `Read "${basepath}".`);
		count++;
	});
	t.ok(count > 0, 'tests completed');
	t.end();
});

test('@gltf-transform/core::io | node.js read glb http', { skip: environment !== Environment.NODE }, async (t) => {
	let count = 0;
	glob.sync(path.join(__dirname, '../in/**/*.glb')).forEach((inputURI) => {
		const basepath = inputURI.replace(path.join(__dirname, '../in'), 'http://' + ip);

		const io = new NodeIO(require('node-fetch'));
		const doc = io.read(basepath);

		t.ok(doc, `Read "${basepath}".`);
		count++;
	});
	t.ok(count > 0, 'tests completed');
	t.end();
});

test('@gltf-transform/core::io | node.js read gltf http', { skip: environment !== Environment.NODE }, async (t) => {
	let count = 0;
	glob.sync(path.join(__dirname, '../in/**/*.gltf')).forEach((inputURI) => {
		const basepath = inputURI.replace(path.join(__dirname, '../in'), 'http://' + ip);

		const io = new NodeIO(require('node-fetch'));
		const doc = io.read(basepath);

		t.ok(doc, `Read "${basepath}".`);
		count++;
	});
	t.ok(count > 0, 'tests completed');
	t.end();
});

test('@gltf-transform/core::io | node.js write glb', { skip: environment !== Environment.NODE }, async (t) => {
	let count = 0;
	const uris = glob.sync(path.join(__dirname, '../in/**/*.gltf'));
	await Promise.all(
		uris.map(async (inputURI) => {
			const basepath = inputURI.replace(path.join(__dirname, '../in'), '.');
			const outputURI = path.join(__dirname, '../out', basepath);

			const io = new NodeIO();
			const doc = await io.read(inputURI);

			ensureDir(outputURI);
			await io.write(outputURI.replace('.gltf', '.glb'), doc);
			t.ok(true, `Wrote "${basepath}".`); // TODO(cleanup): Test the output somehow.
			count++;
		})
	);
	t.ok(count > 0, 'tests completed');
	t.end();
});

test('@gltf-transform/core::io | node.js write gltf', { skip: environment !== Environment.NODE }, async (t) => {
	let count = 0;
	const uris = glob.sync(path.join(__dirname, '../in/**/*.glb'));
	await Promise.all(
		uris.map(async (inputURI) => {
			const basepath = inputURI.replace(path.join(__dirname, '../in'), '.');
			const outputURI = path.join(__dirname, '../out', basepath);

			const io = new NodeIO();
			const doc = await io.read(inputURI);

			ensureDir(outputURI);
			await io.write(outputURI.replace('.glb', '.gltf'), doc);
			t.ok(true, `Wrote "${basepath}".`); // TODO(cleanup): Test the output somehow.
			count++;
		})
	);
	t.ok(count > 0, 'tests completed');
	t.end();
});

test.onFinish(() => server.close());
test.onFailure(() => server.close());