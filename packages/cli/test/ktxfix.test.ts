require('source-map-support').install();

import fs from 'fs';
import path from 'path';
import { KHR_DF_PRIMARIES_BT709, KHR_DF_PRIMARIES_UNSPECIFIED, read } from 'ktx-parse';
import test from 'tape';
import { Document, Logger, Texture } from '@gltf-transform/core';
import { ktxfix } from '../';

test('@gltf-transform/cli::ktxfix', async (t) => {
	const doc = new Document().setLogger(new Logger(Logger.Verbosity.SILENT));
	const material = doc.createMaterial();
	const texture = doc
		.createTexture()
		.setMimeType('image/ktx2')
		.setImage(fs.readFileSync(path.join(__dirname, 'in', 'test.ktx2')));

	t.equals(getColorPrimaries(texture), KHR_DF_PRIMARIES_BT709, 'initial - sRGB');

	await doc.transform(ktxfix());

	t.equals(getColorPrimaries(texture), KHR_DF_PRIMARIES_BT709, 'unused - no change');

	material.setOcclusionTexture(texture);
	await doc.transform(ktxfix());

	t.equals(getColorPrimaries(texture), KHR_DF_PRIMARIES_UNSPECIFIED, 'occlusion - unspecified');

	texture.detach();
	await doc.transform(ktxfix());

	t.equals(getColorPrimaries(texture), KHR_DF_PRIMARIES_UNSPECIFIED, 'unused - no change');

	material.setBaseColorTexture(texture);
	await doc.transform(ktxfix());

	t.equals(getColorPrimaries(texture), KHR_DF_PRIMARIES_BT709, 'base color - sRGB');

	t.end();
});

function getColorPrimaries(texture: Texture): number {
	const image = texture.getImage()!;
	const ktx = read(image);
	return ktx.dataFormatDescriptor[0].colorPrimaries;
}
