import test from 'ava';
import { BufferUtils, Document } from '@gltf-transform/core';
import { KHRTextureBasisu } from '@gltf-transform/extensions';
import { mockCommandExists, mockSpawn, mockWaitExit, ktxdecompress } from '@gltf-transform/cli';
import { logger } from '@gltf-transform/test-utils';
import type { ChildProcess } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('decompress', async (t) => {
	KHRTextureBasisu.register();

	const imageKTX2 = BufferUtils.toView(await readFile(join(__dirname, 'in', 'test.ktx2')));
	const imagePNG = new Uint8Array(32);

	const calls = [] as string[][];

	mockSpawn(async (_, params: string[]): Promise<ChildProcess> => {
		calls.push(params);

		// Mock `ktx` version check.
		if (params.join() === '--version') {
			return { status: 0, stdout: 'v4.0.0', stderr: '' } as unknown as ChildProcess;
		}

		// Mock `ktx` decompression.
		await writeFile(params[params.length - 1], imagePNG);
		return { status: 0, stdout: '', stderr: '' } as unknown as ChildProcess;
	});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	mockWaitExit(async (process: any) => {
		const { status, stdout, stderr } = await process;
		return [status, stdout, stderr];
	});

	mockCommandExists(() => Promise.resolve(true));

	const document = new Document().setLogger(logger);
	document.createExtension(KHRTextureBasisu);
	const texture = document.createTexture().setImage(imageKTX2).setMimeType('image/ktx2');
	await document.transform(ktxdecompress());

	t.is(calls.length, 2, 'calls ktx twice');
	t.deepEqual(calls[0], ['--version'], 'calls ktx with --version');
	t.deepEqual(calls[1][0], 'extract', 'calls ktx extract command');

	t.is(texture.getMimeType(), 'image/png', 'replaces MIME type');
	t.true(BufferUtils.equals(texture.getImage(), imagePNG), 'replaces image');

	t.deepEqual(document.getRoot().listExtensionsUsed(), [], 'removes KHR_texture_basisu extension');
});
