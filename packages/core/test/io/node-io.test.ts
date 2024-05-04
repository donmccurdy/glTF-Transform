import test from 'ava';
import { Document, NodeIO } from '@gltf-transform/core';
import { createPlatformIO, environment, Environment, logger } from '@gltf-transform/test-utils';
import fs from 'fs';
import { dirname, join, resolve } from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MOCK_DOMAIN = 'https://mock.site';

const fetch = async (input: RequestInfo, _init?: RequestInit) => {
	const relPath = input.toString().replace(MOCK_DOMAIN, resolve(__dirname, '../in'));
	return {
		arrayBuffer: () => fs.readFileSync(decodeURIComponent(relPath)),
		text: () => fs.readFileSync(decodeURIComponent(relPath), 'utf8'),
	};
};

function ensureDir(uri) {
	if (!fs.existsSync(uri)) fs.mkdirSync(uri);
}

test('read glb', async (t) => {
	if (environment !== Environment.NODE) return t.pass();
	const io = (await createPlatformIO()) as NodeIO;
	let count = 0;
	for await (const inputURI of glob.sync(resolve(__dirname, '../in/**/*.glb'))) {
		const basepath = inputURI.replace(resolve(__dirname, '../in'), '.');
		const document = io.read(inputURI);

		t.truthy(document, `Read "${basepath}".`);
		count++;
	}
	t.truthy(count > 0, 'tests completed');
});

test('read gltf', async (t) => {
	if (environment !== Environment.NODE) return t.pass();
	const io = (await createPlatformIO()) as NodeIO;
	let count = 0;
	for await (const inputURI of glob.sync(resolve(__dirname, '../in/**/*.gltf'))) {
		const basepath = inputURI.replace(resolve(__dirname, '../in'), '.');
		const document = await io.read(inputURI);

		t.truthy(document, `Read "${basepath}".`);
		count++;
	}
	t.truthy(count > 0, 'tests completed');
});

test('read glb http', async (t) => {
	if (environment !== Environment.NODE) return t.pass();
	const io = new NodeIO(fetch).setLogger(logger).setAllowNetwork(true);
	let count = 0;
	for await (const inputURI of glob.sync(resolve(__dirname, '../in/**/*.glb'))) {
		const basepath = inputURI.replace(resolve(__dirname, '../in'), MOCK_DOMAIN);
		const document = await io.read(basepath);

		t.truthy(document, `Read "${basepath}".`);
		count++;
	}
	t.truthy(count > 0, 'tests completed');
});

test('read gltf http', async (t) => {
	if (environment !== Environment.NODE) return t.pass();
	const io = new NodeIO(fetch).setLogger(logger).setAllowNetwork(true);
	let count = 0;
	for await (const inputURI of glob.sync(resolve(__dirname, '../in/**/*.gltf'))) {
		const basepath = inputURI.replace(resolve(__dirname, '../in'), MOCK_DOMAIN);
		const document = await io.read(basepath);

		t.truthy(document, `Read "${basepath}".`);
		count++;
	}
	t.truthy(count > 0, 'tests completed');
});

test('write glb', async (t) => {
	if (environment !== Environment.NODE) return t.pass();
	const io = (await createPlatformIO()) as NodeIO;
	let count = 0;
	for await (const inputURI of glob.sync(resolve(__dirname, '../in/**/*.gltf'))) {
		const basepath = inputURI.replace(resolve(__dirname, '../in'), '.');
		const outputURI = resolve(__dirname, `../out/${basepath}`);
		const document = await io.read(inputURI);

		ensureDir(dirname(outputURI));
		await io.write(outputURI.replace('.gltf', '.glb'), document);
		t.truthy(true, `Wrote "${basepath}".`); // TODO(cleanup): Test the output somehow.
		count++;
	}
	t.truthy(count > 0, 'tests completed');
});

test('write gltf', async (t) => {
	if (environment !== Environment.NODE) return t.pass();
	const io = (await createPlatformIO()) as NodeIO;
	let count = 0;
	for await (const inputURI of glob.sync(resolve(__dirname, '../in/**/*.glb'))) {
		const basepath = inputURI.replace(resolve(__dirname, '../in'), '.');
		const outputURI = resolve(__dirname, `../out/${basepath}`);
		const document = await io.read(inputURI);

		ensureDir(dirname(outputURI));
		await io.write(outputURI.replace('.glb', '.gltf'), document);
		t.truthy(true, `Wrote "${basepath}".`); // TODO(cleanup): Test the output somehow.
		count++;
	}
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
	const outputURI = resolve(__dirname, '../out/node-io-external-test');
	ensureDir(outputURI);
	await io.write(join(outputURI, 'scene.gltf'), document);
	t.truthy(fs.existsSync(join(outputURI, 'internal.png')), 'writes internal image');
	t.falsy(fs.existsSync(join(outputURI, 'external.png')), 'skips external image');
	t.truthy(io.lastWriteBytes < 2048, 'writes < 2048 bytes');
});

test('resource URI encoding', async (t) => {
	if (environment !== Environment.NODE) return t.pass();
	const io = (await createPlatformIO()) as NodeIO;

	const srcDir = resolve(__dirname, '..', 'in', 'EncodingTest');
	const dstDir = resolve(__dirname, '..', 'out', 'EncodingTest');
	ensureDir(dstDir);

	const srcJSONDocument = await io.readAsJSON(resolve(srcDir, 'Unicode ❤♻ Test.gltf'));

	t.deepEqual(
		Object.keys(srcJSONDocument.resources).sort(),
		['Unicode%20❤♻ Binary.bin', 'Unicode%20❤♻ Texture.png'],
		'URIs in source JSON document',
	);

	const document = await io.readJSON(srcJSONDocument);
	const buffer = document.getRoot().listBuffers()[0];
	const texture = document.getRoot().listTextures()[0];

	// TODO(v4): For backward-compatibility, URIs remain encoded in memory.
	t.deepEqual(
		[buffer.getURI(), texture.getURI()],
		['Unicode%20❤♻ Binary.bin', 'Unicode%20❤♻ Texture.png'],
		'URIs in document',
	);

	const dstJSONDocument = await io.writeJSON(document);

	t.deepEqual(
		Object.keys(dstJSONDocument.resources).sort(),
		['Unicode%20❤♻ Binary.bin', 'Unicode%20❤♻ Texture.png'],
		'URIs in source JSON document',
	);

	await io.write(resolve(dstDir, 'Unicode ❤♻ Test.gltf'), document);

	// Decoded URIs match source resources, not the (encoded) URI in the source glTF JSON.
	t.true(fs.existsSync(resolve(dstDir, 'Unicode ❤♻ Binary.bin')), 'file path to buffer');
	t.true(fs.existsSync(resolve(dstDir, 'Unicode ❤♻ Texture.png')), 'file path to texture');
});
