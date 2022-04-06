require('source-map-support').install();

import fs from 'fs/promises';
import test from 'tape';
import { Document, Logger, TextureChannel, vec2 } from '@gltf-transform/core';
import { MaterialsClearcoat } from '@gltf-transform/extensions';
import { Mode, mockCommandExists, mockSpawn, toktx, mockWaitExit } from '../';
import type { ChildProcess } from 'child_process';

const { R, G } = TextureChannel;

test('@gltf-transform/cli::toktx | resize', async (t) => {
	t.equals(await getParams({ mode: Mode.ETC1S }, [508, 508]), '--genmipmap --bcmp', '508x508 → no change');

	t.equals(
		await getParams({ mode: Mode.ETC1S }, [507, 509]),
		'--genmipmap --bcmp --resize 508x512',
		'507x509 → 508x512'
	);

	t.equals(
		await getParams({ mode: Mode.ETC1S, powerOfTwo: true }, [508, 508]),
		'--genmipmap --bcmp --resize 512x512',
		'508x508+powerOfTwo → 512x512'
	);

	t.equals(
		await getParams({ mode: Mode.ETC1S, powerOfTwo: true }, [5, 3]),
		'--genmipmap --bcmp --resize 4x4',
		'5x3+powerOfTwo → 4x4'
	);

	t.equals(
		await getParams({ mode: Mode.ETC1S }, [508, 508], R),
		'--genmipmap --bcmp --assign_oetf linear --assign_primaries none --target_type R',
		'channels → R'
	);

	t.equals(
		await getParams({ mode: Mode.ETC1S }, [508, 508], G),
		'--genmipmap --bcmp --assign_oetf linear --assign_primaries none --target_type RG',
		'channels → RG'
	);

	t.end();
});

async function getParams(options: Record<string, unknown>, size: vec2, channels = 0): Promise<string> {
	const doc = new Document().setLogger(new Logger(Logger.Verbosity.SILENT));
	const tex = doc.createTexture().setImage(new Uint8Array(10)).setMimeType('image/png');
	tex.getSize = (): vec2 => size;

	// Assign texture to materials so that the given channels are in use.
	if (channels === R) {
		doc.createMaterial().setOcclusionTexture(tex);
	} else if (channels === G) {
		const clearcoatExtension = doc.createExtension(MaterialsClearcoat);
		const clearcoat = clearcoatExtension.createClearcoat().setClearcoatRoughnessTexture(tex);
		doc.createMaterial().setExtension('KHR_materials_clearcoat', clearcoat);
	} else if (channels !== 0x0000) {
		throw new Error('Unimplemented channels setting');
	}

	let actualParams: string[];
	mockSpawn(async (_, params: string[]): Promise<ChildProcess> => {
		// Mock `toktx` version check.
		if (params.join() === '--version') {
			return { status: 0, stdout: 'v4.0.0', stderr: '' } as unknown as ChildProcess;
		}

		// Mock `toktx` compression.
		actualParams = params;
		await fs.writeFile(params[params.length - 2], new Uint8Array(8));
		return { status: 0, stdout: '', stderr: '' } as unknown as ChildProcess;
	});
	mockWaitExit(async (process) => {
		const { status, stdout, stderr } = await process;
		return [status, stdout, stderr];
	});
	mockCommandExists(() => Promise.resolve(true));

	await doc.transform(toktx(options));

	return actualParams.slice(0, -2).join(' ');
}
