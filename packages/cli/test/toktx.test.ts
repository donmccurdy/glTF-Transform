import fs from 'fs/promises';
import test from 'ava';
import { Document, TextureChannel, vec2 } from '@gltf-transform/core';
import { KHRMaterialsClearcoat } from '@gltf-transform/extensions';
import { Mode, mockCommandExists, mockSpawn, toktx, mockWaitExit } from '@gltf-transform/cli';
import { logger } from '@gltf-transform/test-utils';
import type { ChildProcess } from 'child_process';

const { R, G } = TextureChannel;

test('compress and resize', async (t) => {
	t.is(
		await getParams({ mode: Mode.ETC1S }, [508, 508]),
		'create --generate-mipmap --encode basis-lz --format R8G8B8_UNORM',
		'508x508 → no change',
	);

	t.is(
		await getParams({ mode: Mode.ETC1S }, [507, 509]),
		'create --generate-mipmap --encode basis-lz --format R8G8B8_UNORM --width 508 --height 512',
		'507x509 → 508x512',
	);

	t.is(
		await getParams({ mode: Mode.ETC1S, powerOfTwo: true }, [508, 508]),
		'create --generate-mipmap --encode basis-lz --format R8G8B8_UNORM --width 512 --height 512',
		'508x508+powerOfTwo → 512x512',
	);

	t.is(
		await getParams({ mode: Mode.ETC1S, powerOfTwo: true }, [5, 3]),
		'create --generate-mipmap --encode basis-lz --format R8G8B8_UNORM --width 4 --height 4',
		'5x3+powerOfTwo → 4x4',
	);

	t.is(
		await getParams({ mode: Mode.ETC1S }, [508, 508], R),
		'create --generate-mipmap --encode basis-lz --assign-oetf linear --assign-primaries none --format R8_UNORM',
		'channels → R',
	);

	t.is(
		await getParams({ mode: Mode.ETC1S }, [508, 508], G),
		'create --generate-mipmap --encode basis-lz --assign-oetf linear --assign-primaries none --format R8G8_UNORM',
		'channels → RG',
	);
});

async function getParams(options: Record<string, unknown>, size: vec2, channels = 0): Promise<string> {
	const document = new Document().setLogger(logger);
	const tex = document.createTexture().setImage(new Uint8Array(10)).setMimeType('image/png');
	tex.getSize = (): vec2 => size;

	// Assign texture to materials so that the given channels are in use.
	if (channels === R) {
		document.createMaterial().setOcclusionTexture(tex);
	} else if (channels === G) {
		const clearcoatExtension = document.createExtension(KHRMaterialsClearcoat);
		const clearcoat = clearcoatExtension.createClearcoat().setClearcoatRoughnessTexture(tex);
		document.createMaterial().setExtension('KHR_materials_clearcoat', clearcoat);
	} else if (channels !== 0x0000) {
		throw new Error('Unimplemented channels setting');
	}

	let actualParams: string[];
	mockSpawn(async (_, params: string[]): Promise<ChildProcess> => {
		// Mock `ktx` version check.
		if (params.join() === '--version') {
			return { status: 0, stdout: 'v4.0.0', stderr: '' } as unknown as ChildProcess;
		}

		// Mock `ktx` compression.
		actualParams = params;
		await fs.writeFile(params[params.length - 1], new Uint8Array(8));
		return { status: 0, stdout: '', stderr: '' } as unknown as ChildProcess;
	});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	mockWaitExit(async (process: any) => {
		const { status, stdout, stderr } = await process;
		return [status, stdout, stderr];
	});
	mockCommandExists(() => Promise.resolve(true));

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	await document.transform(toktx(options as any));

	return actualParams.slice(0, -2).join(' ');
}
