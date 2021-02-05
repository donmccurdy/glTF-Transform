require('source-map-support').install();

import fs from 'fs';
import test from 'tape';
import { Document, Logger, vec2 } from '@gltf-transform/core';
import { Mode, mockCommandExistsSync, mockSpawnSync, toktx } from '../';

test('@gltf-transform/cli::toktx | resize', async t => {
	t.equals(
		await getParams({mode: Mode.ETC1S}, [508, 508]),
		'--genmipmap --bcmp',
		'508x508 → no change'
	);

	t.equals(
		await getParams({mode: Mode.ETC1S}, [507, 509]),
		'--genmipmap --bcmp --resize 508x512',
		'507x509 → 508x512'
	);

	t.equals(
		await getParams({mode: Mode.ETC1S, powerOfTwo: true}, [508, 508]),
		'--genmipmap --bcmp --resize 512x512',
		'508x508+powerOfTwo → 512x512'
	);

	t.equals(
		await getParams({mode: Mode.ETC1S, powerOfTwo: true}, [5, 3]),
		'--genmipmap --bcmp --resize 4x4',
		'5x3+powerOfTwo → 4x4'
	);

	t.end();
});

async function getParams(options: Record<string, unknown>, size: vec2): Promise<string> {
	const doc = new Document().setLogger(new Logger(Logger.Verbosity.SILENT));
	const tex = doc.createTexture()
		.setImage(new ArrayBuffer(10))
		.setMimeType('image/png');
	tex.getSize = (): vec2 => size;

	let actualParams: string[];
	mockSpawnSync((_, params: string[]) => {
		actualParams = params;
		fs.writeFileSync(params[params.length - 2], Buffer.from(new ArrayBuffer(8)));
		return {status: 0};
	});
	mockCommandExistsSync(() => true);

	await doc.transform(toktx(options));

	return actualParams.slice(0, -2).join(' ');
}
