import fs from 'fs/promises';
import test from 'ava';
import { Document, TextureChannel, vec2 } from '@gltf-transform/core';
import { KHRMaterialsClearcoat } from '@gltf-transform/extensions';
import { Mode, mockCommandExists, mockSpawn, toktx, mockWaitExit } from '@gltf-transform/cli';
import { logger } from '@gltf-transform/test-utils';
import type { ChildProcess } from 'child_process';
import ndarray from 'ndarray';
import { savePixels } from 'ndarray-pixels';

const { R, G } = TextureChannel;

const createImage = (size: vec2): Promise<Uint8Array> => {
	const pixels = ndarray(new Uint8Array(size[0] * size[1] * 4), [size[0], size[1], 4]);
	return savePixels(pixels, 'image/png');
};

test('compress and resize', async (t) => {
	t.is(
		await getParams({ mode: Mode.ETC1S }, await createImage([508, 508])),
		'create --generate-mipmap --encode basis-lz --format R8G8B8_UNORM',
		'508x508 → no change',
	);

	t.is(
		await getParams({ mode: Mode.ETC1S }, await createImage([507, 509])),
		'create --generate-mipmap --encode basis-lz --format R8G8B8_UNORM --width 508 --height 512',
		'507x509 → 508x512',
	);

	t.is(
		await getParams({ mode: Mode.ETC1S, resize: [504, 504] }, await createImage([508, 508])),
		'create --generate-mipmap --encode basis-lz --format R8G8B8_UNORM --width 504 --height 504',
		'508x508 → 504x504',
	);

	t.is(
		await getParams({ mode: Mode.ETC1S, resize: [4, 4] }, await createImage([5, 3])),
		'create --generate-mipmap --encode basis-lz --format R8G8B8_UNORM --width 4 --height 4',
		'5x3 → 4x4',
	);

	t.is(
		await getParams({ mode: Mode.ETC1S }, await createImage([508, 508]), R),
		'create --generate-mipmap --encode basis-lz --assign-oetf linear --assign-primaries none --format R8_UNORM',
		'channels → R',
	);

	t.is(
		await getParams({ mode: Mode.ETC1S }, await createImage([508, 508]), G),
		'create --generate-mipmap --encode basis-lz --assign-oetf linear --assign-primaries none --format R8G8_UNORM',
		'channels → RG',
	);
});

async function getParams(options: Record<string, unknown>, image: Uint8Array, channels = 0): Promise<string> {
	const document = new Document().setLogger(logger);
	const tex = document.createTexture().setImage(image).setMimeType('image/png');

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

	let width: number | null = null;
	let height: number | null = null;

	const mockEncoder = (image: Uint8Array) => {
		const self = { toFormat, resize, toBuffer };
		function toFormat(_format: string) {
			return self;
		}
		function resize(_width, _height, _options) {
			width = _width;
			height = _height;
			return self;
		}
		function toBuffer() {
			return Promise.resolve(image);
		}
		return self;
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	await document.transform(toktx({ ...options, encoder: mockEncoder } as any));

	// No longer using the --width and --height params, but we'll keep the mock API.
	let formattedParams = actualParams.slice(0, -2).join(' ');
	if (width || height) {
		formattedParams += ` --width ${width} --height ${height}`;
	}
	return formattedParams;
}
