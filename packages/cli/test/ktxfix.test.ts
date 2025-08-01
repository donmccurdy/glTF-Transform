import { ktxfix } from '@gltf-transform/cli';
import { Document, type Texture } from '@gltf-transform/core';
import { logger } from '@gltf-transform/test-utils';
import test from 'ava';
import fs from 'fs';
import { KHR_DF_PRIMARIES_BT709, KHR_DF_PRIMARIES_UNSPECIFIED, read } from 'ktx-parse';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('repair', async (t) => {
	const document = new Document().setLogger(logger);
	const material = document.createMaterial();
	const texture = document
		.createTexture()
		.setMimeType('image/ktx2')
		.setImage(fs.readFileSync(path.join(__dirname, 'in', 'test.ktx2')));

	t.is(getColorPrimaries(texture), KHR_DF_PRIMARIES_BT709, 'initial - sRGB');

	await document.transform(ktxfix());

	t.is(getColorPrimaries(texture), KHR_DF_PRIMARIES_BT709, 'unused - no change');

	material.setOcclusionTexture(texture);
	await document.transform(ktxfix());

	t.is(getColorPrimaries(texture), KHR_DF_PRIMARIES_UNSPECIFIED, 'occlusion - unspecified');

	texture.detach();
	await document.transform(ktxfix());

	t.is(getColorPrimaries(texture), KHR_DF_PRIMARIES_UNSPECIFIED, 'unused - no change');

	material.setBaseColorTexture(texture);
	await document.transform(ktxfix());

	t.is(getColorPrimaries(texture), KHR_DF_PRIMARIES_BT709, 'base color - sRGB');
});

function getColorPrimaries(texture: Texture): number {
	const image = texture.getImage()!;
	const ktx = read(image);
	return ktx.dataFormatDescriptor[0].colorPrimaries;
}
