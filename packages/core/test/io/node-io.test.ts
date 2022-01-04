import test from 'tape';
import { environment, Environment } from '../../../test-utils';
import { NodeIO } from '@gltf-transform/core';

const MOCK_DOMAIN = 'https://mock.site';

let fs, glob, path;
if (environment === Environment.NODE) {
	fs = require('fs');
	glob = require('glob');
	path = require('path');
}

const fetch = async (input: RequestInfo, _init?: RequestInit) => {
	const relPath = input.toString().replace(MOCK_DOMAIN, path.join(__dirname, '../in'));
	return {
		arrayBuffer: () => fs.readFileSync(relPath),
		text: () => fs.readFileSync(relPath, 'utf8'),
	};
};

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
	await Promise.all(
		glob.sync(path.join(__dirname, '../in/**/*.glb')).map(async (inputURI) => {
			const basepath = inputURI.replace(path.join(__dirname, '../in'), MOCK_DOMAIN);

			const io = new NodeIO(fetch);
			const doc = await io.read(basepath);

			t.ok(doc, `Read "${basepath}".`);
			count++;
		})
	);
	t.ok(count > 0, 'tests completed');
	t.end();
});

test('@gltf-transform/core::io | node.js read gltf http', { skip: environment !== Environment.NODE }, async (t) => {
	let count = 0;
	await Promise.all(
		glob.sync(path.join(__dirname, '../in/**/*.gltf')).map(async (inputURI) => {
			const basepath = inputURI.replace(path.join(__dirname, '../in'), MOCK_DOMAIN);

			const io = new NodeIO(fetch);
			const doc = await io.read(basepath);

			t.ok(doc, `Read "${basepath}".`);
			count++;
		})
	);
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
