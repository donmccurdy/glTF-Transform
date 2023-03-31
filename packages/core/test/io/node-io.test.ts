import test from 'ava';
import { Document, NodeIO } from '@gltf-transform/core';
import { createPlatformIO, environment, Environment, logger, resolve } from '@gltf-transform/test-utils';
import fs from 'fs';
import { dirname, join } from 'path';
import glob from 'glob';

const MOCK_DOMAIN = 'https://mock.site';

const fetch = async (input: RequestInfo, _init?: RequestInit) => {
	const relPath = input.toString().replace(MOCK_DOMAIN, resolve('../in', import.meta.url));
	return {
		arrayBuffer: () => fs.readFileSync(relPath),
		text: () => fs.readFileSync(relPath, 'utf8'),
	};
};

function ensureDir(uri) {
	if (!fs.existsSync(uri)) fs.mkdirSync(uri);
}

// TODO(cleanup): These tests are passing a Promise into t.truthy(), probably missed
// that while refactoring NodeIO to async methods. Should await them instead.

test('read glb', async (t) => {
	if (environment !== Environment.NODE) return t.pass();
	const io = await createPlatformIO();
	let count = 0;
	glob.sync(resolve('../in/**/*.glb', import.meta.url)).forEach((inputURI) => {
		const basepath = inputURI.replace(resolve('../in', import.meta.url), '.');
		const document = io.read(inputURI);

		t.truthy(document, `Read "${basepath}".`);
		count++;
	});
	t.truthy(count > 0, 'tests completed');
});

test('read gltf', async (t) => {
	if (environment !== Environment.NODE) return t.pass();
	const io = await createPlatformIO();
	let count = 0;
	glob.sync(resolve('../in/**/*.gltf', import.meta.url)).forEach((inputURI) => {
		const basepath = inputURI.replace(resolve('../in', import.meta.url), '.');
		const document = io.read(inputURI);

		t.truthy(document, `Read "${basepath}".`);
		count++;
	});
	t.truthy(count > 0, 'tests completed');
});

test('read glb http', async (t) => {
	if (environment !== Environment.NODE) return t.pass();
	const io = new NodeIO(fetch).setLogger(logger).setAllowHTTP(true);
	let count = 0;
	await Promise.all(
		glob.sync(resolve('../in/**/*.glb', import.meta.url)).map(async (inputURI) => {
			const basepath = inputURI.replace(resolve('../in', import.meta.url), MOCK_DOMAIN);
			const document = await io.read(basepath);

			t.truthy(document, `Read "${basepath}".`);
			count++;
		})
	);
	t.truthy(count > 0, 'tests completed');
});

test('read gltf http', async (t) => {
	if (environment !== Environment.NODE) return t.pass();
	const io = new NodeIO(fetch).setLogger(logger).setAllowHTTP(true);
	let count = 0;
	await Promise.all(
		glob.sync(resolve('../in/**/*.gltf', import.meta.url)).map(async (inputURI) => {
			const basepath = inputURI.replace(resolve('../in', import.meta.url), MOCK_DOMAIN);
			const document = await io.read(basepath);

			t.truthy(document, `Read "${basepath}".`);
			count++;
		})
	);
	t.truthy(count > 0, 'tests completed');
});

test('write glb', async (t) => {
	if (environment !== Environment.NODE) return t.pass();
	const io = (await createPlatformIO()) as NodeIO;
	let count = 0;
	const uris = glob.sync(resolve('../in/**/*.gltf', import.meta.url));
	await Promise.all(
		uris.map(async (inputURI) => {
			const basepath = inputURI.replace(resolve('../in', import.meta.url), '.');
			const outputURI = resolve(`../out/${basepath}`, import.meta.url);
			const document = await io.read(inputURI);

			ensureDir(dirname(outputURI));
			await io.write(outputURI.replace('.gltf', '.glb'), document);
			t.truthy(true, `Wrote "${basepath}".`); // TODO(cleanup): Test the output somehow.
			count++;
		})
	);
	t.truthy(count > 0, 'tests completed');
});

test('write gltf', async (t) => {
	if (environment !== Environment.NODE) return t.pass();
	const io = (await createPlatformIO()) as NodeIO;
	let count = 0;
	const uris = glob.sync(resolve('../in/**/*.glb', import.meta.url));
	await Promise.all(
		uris.map(async (inputURI) => {
			const basepath = inputURI.replace(resolve('../in', import.meta.url), '.');
			const outputURI = resolve(`../out/${basepath}`, import.meta.url);
			const document = await io.read(inputURI);

			ensureDir(dirname(outputURI));
			await io.write(outputURI.replace('.glb', '.gltf'), document);
			t.truthy(true, `Wrote "${basepath}".`); // TODO(cleanup): Test the output somehow.
			count++;
		})
	);
	t.truthy(count > 0, 'tests completed');
});

test('write gltf with HTTP', async (t) => {
	if (environment !== Environment.NODE) return t.pass();
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
	const io = (await createPlatformIO()) as NodeIO;
	const outputURI = resolve('../out/node-io-external-test', import.meta.url);
	ensureDir(outputURI);
	await io.write(join(outputURI, 'scene.gltf'), document);
	t.truthy(fs.existsSync(join(outputURI, 'internal.png')), 'writes internal image');
	t.falsy(fs.existsSync(join(outputURI, 'external.png')), 'skips external image');
	t.truthy(io.lastWriteBytes < 2048, 'writes < 2048 bytes');
});
