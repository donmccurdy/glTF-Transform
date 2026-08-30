import { deepEqual, ok, rejects, strictEqual } from 'node:assert/strict';
import { glob, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO } from '@gltf-transform/core';
import { createPlatformIO, Environment, environment, logger } from '@gltf-transform/test-utils';

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

describe('core::NodeIO', () => {
	test('read glb', async () => {
		if (environment !== Environment.NODE) return;
		const io = (await createPlatformIO()) as NodeIO;
		let count = 0;
		for await (const inputURI of glob(resolve(__dirname, '../in/**/*.glb'))) {
			const basepath = inputURI.replace(resolve(__dirname, '../in'), '.');
			const document = io.read(inputURI);

			ok(document, `Read "${basepath}".`);
			count++;
		}
		ok(count > 0, 'tests completed');
	});

	test('read gltf', async () => {
		if (environment !== Environment.NODE) return;
		const io = (await createPlatformIO()) as NodeIO;
		let count = 0;
		for await (const inputURI of glob(resolve(__dirname, '../in/**/*.gltf'))) {
			const basepath = inputURI.replace(resolve(__dirname, '../in'), '.');
			const document = await io.read(inputURI);

			ok(document, `Read "${basepath}".`);
			count++;
		}
		ok(count > 0, 'tests completed');
	});

	test('read glb http', async () => {
		if (environment !== Environment.NODE) return;
		const io = new NodeIO(fetch).setLogger(logger).setAllowNetwork(true);
		let count = 0;
		for await (const inputURI of glob(resolve(__dirname, '../in/**/*.glb'))) {
			const basepath = inputURI.replace(resolve(__dirname, '../in'), MOCK_DOMAIN);
			const document = await io.read(basepath);

			ok(document, `Read "${basepath}".`);
			count++;
		}
		ok(count > 0, 'tests completed');
	});

	test('read gltf http', async () => {
		if (environment !== Environment.NODE) return;
		const io = new NodeIO(fetch).setLogger(logger).setAllowNetwork(true);
		let count = 0;
		for await (const inputURI of glob(resolve(__dirname, '../in/**/*.gltf'))) {
			const basepath = inputURI.replace(resolve(__dirname, '../in'), MOCK_DOMAIN);
			const document = await io.read(basepath);

			ok(document, `Read "${basepath}".`);
			count++;
		}
		ok(count > 0, 'tests completed');
	});

	test('write glb', async () => {
		if (environment !== Environment.NODE) return;
		const io = (await createPlatformIO()) as NodeIO;
		let count = 0;
		for await (const inputURI of glob(resolve(__dirname, '../in/**/*.gltf'))) {
			const basepath = inputURI.replace(resolve(__dirname, '../in'), '.');
			const outputURI = resolve(__dirname, `../out/${basepath}`);
			const document = await io.read(inputURI);

			await mkdir(dirname(outputURI), { recursive: true });
			await io.write(outputURI.replace('.gltf', '.glb'), document);
			ok(true, `Wrote "${basepath}".`); // TODO(cleanup): Test the output somehow.
			count++;
		}
		ok(count > 0, 'tests completed');
	});

	test('write gltf', async () => {
		if (environment !== Environment.NODE) return;
		const io = (await createPlatformIO()) as NodeIO;
		let count = 0;
		for await (const inputURI of glob(resolve(__dirname, '../in/**/*.glb'))) {
			const basepath = inputURI.replace(resolve(__dirname, '../in'), '.');
			const outputURI = resolve(__dirname, `../out/${basepath}`);
			const document = await io.read(inputURI);

			await mkdir(dirname(outputURI), { recursive: true });
			await io.write(outputURI.replace('.glb', '.gltf'), document);
			ok(true, `Wrote "${basepath}".`); // TODO(cleanup): Test the output somehow.
			count++;
		}
		ok(count > 0, 'tests completed');
	});

	test('write gltf with HTTP', async () => {
		if (environment !== Environment.NODE) return;
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
		ok((await stat(join(outputURI, 'internal.png'))).isFile(), 'writes internal image');
		strictEqual(await stat(join(outputURI, 'external.png')).catch(() => false), false, 'skips external image');
		ok(io.lastWriteBytes < 2048, 'writes < 2048 bytes');
	});

	test('resource URI encoding', async () => {
		if (environment !== Environment.NODE) return;
		const io = (await createPlatformIO()) as NodeIO;

		const srcDir = resolve(__dirname, '..', 'in', 'EncodingTest');
		const dstDir = resolve(__dirname, '..', 'out', 'EncodingTest');
		await mkdir(dstDir, { recursive: true });

		const srcJSONDocument = await io.readAsJSON(resolve(srcDir, 'Unicode ❤♻ Test.gltf'));

		deepEqual(
			Object.keys(srcJSONDocument.resources).sort(),
			['Unicode%20❤♻ Binary.bin', 'Unicode%20❤♻ Texture.png'],
			'URIs in source JSON document',
		);

		const document = await io.readJSON(srcJSONDocument);
		const buffer = document.getRoot().listBuffers()[0];
		const texture = document.getRoot().listTextures()[0];

		// TODO(v4): For backward-compatibility, URIs remain encoded in memory.
		deepEqual(
			[buffer.getURI(), texture.getURI()],
			['Unicode%20❤♻ Binary.bin', 'Unicode%20❤♻ Texture.png'],
			'URIs in document',
		);

		const dstJSONDocument = await io.writeJSON(document);

		deepEqual(
			Object.keys(dstJSONDocument.resources).sort(),
			['Unicode%20❤♻ Binary.bin', 'Unicode%20❤♻ Texture.png'],
			'URIs in source JSON document',
		);

		await io.write(resolve(dstDir, 'Unicode ❤♻ Test.gltf'), document);

		// Decoded URIs match source resources, not the (encoded) URI in the source glTF JSON.
		ok((await stat(resolve(dstDir, 'Unicode ❤♻ Binary.bin'))).isFile(), 'file path to buffer');
		ok((await stat(resolve(dstDir, 'Unicode ❤♻ Texture.png'))).isFile(), 'file path to texture');
	});

	test('strict / non-strict resource modes', async () => {
		if (environment !== Environment.NODE) return;
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

		await rejects(() => io.read(dstPath), { message: /no such file/i }, 'throws on missing image');

		io.setStrictResources(false);

		const document = await io.read(dstPath);
		const textures = document.getRoot().listTextures();
		strictEqual(textures.length, 1, 'texture != null');
		strictEqual(textures[0].getImage(), null, 'texture.image == null');
	});
});
