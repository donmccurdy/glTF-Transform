import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, type GLTF, NodeIO } from '@gltf-transform/core';
import { createPlatformIO, Environment, environment, logger } from '@gltf-transform/test-utils';
import test from 'ava';
import { glob } from 'glob';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MOCK_DOMAIN = 'https://mock.site';

const fetch = async (input: RequestInfo, _init?: RequestInit) => {
	if (input.toString().includes('__missing')) {
		return {
			arrayBuffer: () => Promise.reject(new Error('[mock] 404 Not Found')),
			text: () => Promise.reject(new Error('[mock] 404 Not Found')),
		};
	}
	const relPath = input.toString().replace(MOCK_DOMAIN, resolve(__dirname, '../in'));
	return {
		arrayBuffer: () => readFile(decodeURIComponent(relPath)),
		text: () => readFile(decodeURIComponent(relPath), 'utf8'),
	};
};

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

		await mkdir(dirname(outputURI), { recursive: true });
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

		await mkdir(dirname(outputURI), { recursive: true });
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
	await mkdir(outputURI, { recursive: true });
	await io.write(join(outputURI, 'scene.gltf'), document);
	t.truthy((await stat(join(outputURI, 'internal.png'))).isFile(), 'writes internal image');
	t.falsy(await stat(join(outputURI, 'external.png')).catch(() => false), 'skips external image');
	t.truthy(io.lastWriteBytes < 2048, 'writes < 2048 bytes');
});

test('resource URI encoding', async (t) => {
	if (environment !== Environment.NODE) return t.pass();
	const io = (await createPlatformIO()) as NodeIO;

	const srcDir = resolve(__dirname, '..', 'in', 'EncodingTest');
	const dstDir = resolve(__dirname, '..', 'out', 'EncodingTest');
	await mkdir(dstDir, { recursive: true });

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
	t.true((await stat(resolve(dstDir, 'Unicode ❤♻ Binary.bin'))).isFile(), 'file path to buffer');
	t.true((await stat(resolve(dstDir, 'Unicode ❤♻ Texture.png'))).isFile(), 'file path to texture');
});

test('strict / non-strict resource modes', async (t) => {
	if (environment !== Environment.NODE) return t.pass();
	const io = new NodeIO(fetch).setLogger(logger).setAllowNetwork(true);

	const dstDir = resolve(__dirname, '..', 'out', 'MissingImageTest');
	const dstPath = resolve(dstDir, 'MissingImage.gltf');
	await mkdir(dstDir, { recursive: true });

	writeFile(
		dstPath,
		JSON.stringify({
			asset: { version: '2.0' },
			images: [{ uri: '__missing.png', mimeType: 'image/png' }],
		}),
	);

	await t.throwsAsync(() => io.read(dstPath), { message: /no such file/i }, 'throws on missing image');

	io.setStrictResources(false);

	const document = await io.read(dstPath);
	const textures = document.getRoot().listTextures();
	t.is(textures.length, 1, 'texture != null');
	t.is(textures[0].getImage(), null, 'texture.image == null');
});
