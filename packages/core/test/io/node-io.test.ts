import test from 'tape';
import { environment, Environment } from '../../../test-utils';
import { Document, NodeIO } from '@gltf-transform/core';

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
	if (!fs.existsSync(uri)) fs.mkdirSync(uri);
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

			const io = new NodeIO(fetch).setAllowHTTP(true);
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

			const io = new NodeIO(fetch).setAllowHTTP(true);
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

			ensureDir(path.dirname(outputURI));
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

			ensureDir(path.dirname(outputURI));
			await io.write(outputURI.replace('.glb', '.gltf'), doc);
			t.ok(true, `Wrote "${basepath}".`); // TODO(cleanup): Test the output somehow.
			count++;
		})
	);
	t.ok(count > 0, 'tests completed');
	t.end();
});

test(
	'@gltf-transform/core::io | node.js write gltf with HTTP',
	{ skip: environment !== Environment.NODE },
	async (t) => {
		const document = new Document();
		document.createBuffer();
		document
			.createTexture('Internal Texture')
			.setURI('internal.png')
			.setMimeType('image/png')
			.setImage(new Uint8Array(1024));
		document
			.createTexture('External Texture')
			.setURI('https://test.example/external.png')
			.setMimeType('image/png')
			.setImage(new Uint8Array(1024));
		const io = new NodeIO();
		const outputURI = path.join(__dirname, '../out', 'node-io-external-test');
		ensureDir(outputURI);
		await io.write(path.join(outputURI, 'scene.gltf'), document);
		t.ok(fs.existsSync(path.join(outputURI, 'internal.png')), 'writes internal image');
		t.notOk(fs.existsSync(path.join(outputURI, 'external.png')), 'skips external image');
		t.ok(io.lastWriteBytes < 2048, 'writes < 2048 bytes');
		t.end();
	}
);
