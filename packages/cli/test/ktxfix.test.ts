require('source-map-support').install();

import fs from 'fs';
import path from 'path';
import { KTX2Primaries, read } from 'ktx-parse';
import test from 'tape';
import { BufferUtils, Document, Logger, Texture } from '@gltf-transform/core';
import { ktxfix } from '../';

test('@gltf-transform/cli::ktxfix', async t => {
	const doc = new Document().setLogger(new Logger(Logger.Verbosity.SILENT));
	const material = doc.createMaterial();
	const texture = doc.createTexture()
		.setMimeType('image/ktx2')
		.setImage(BufferUtils.trim(fs.readFileSync(path.join(__dirname, 'in', 'test.ktx2'))));

	t.equals(getColorPrimaries(texture), KTX2Primaries.SRGB, 'initial - sRGB');

	await doc.transform(ktxfix());

	t.equals(getColorPrimaries(texture), KTX2Primaries.SRGB, 'unused - no change');

	material.setOcclusionTexture(texture);
	await doc.transform(ktxfix());

	t.equals(getColorPrimaries(texture), KTX2Primaries.UNSPECIFIED, 'occlusion - unspecified');

	texture.detach();
	await doc.transform(ktxfix());

	t.equals(getColorPrimaries(texture), KTX2Primaries.UNSPECIFIED, 'unused - no change');

	material.setBaseColorTexture(texture);
	await doc.transform(ktxfix());

	t.equals(getColorPrimaries(texture), KTX2Primaries.SRGB, 'base color - sRGB');

	t.end();
});

function getColorPrimaries(texture: Texture): KTX2Primaries {
	const image = texture.getImage();
	const ktx = read(new Uint8Array(image));
	return ktx.dataFormatDescriptor[0].colorPrimaries;
}
