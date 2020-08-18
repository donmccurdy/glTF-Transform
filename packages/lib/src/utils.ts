import * as getPixelsNamespace from 'get-pixels';
import * as ndarray from 'ndarray';
import * as savePixelsNamespace from 'save-pixels';
import { BufferUtils, Texture } from '@gltf-transform/core';

const getPixels = getPixelsNamespace['default'] as Function;
const savePixels = savePixelsNamespace['default'] as Function;

/** Maps pixels from source to target textures, with a per-pixel callback. */
export async function rewriteTexture(
		source: Texture,
		target: Texture,
		fn: (pixels: ndarray, i: number, j: number) => void): Promise<Texture> {

	if (!source) return null;

	const pixels: ndarray = await new Promise((resolve, reject) => {
		(getPixels as unknown as Function)(
			Buffer.from(source.getImage()),
			source.getMimeType(),
			(err, pixels) => err ? reject(err) : resolve(pixels)
		);
	});

	for(let i = 0; i < pixels.shape[0]; ++i) {
		for(let j = 0; j < pixels.shape[1]; ++j) {
			fn(pixels, i, j);
		}
	}

	const image: ArrayBuffer = await new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		savePixels(pixels, 'png')
			.on('data', (d) => chunks.push(d))
			.on('end', () => resolve(BufferUtils.trim(Buffer.concat(chunks))))
			.on('error', (e) => reject(e));
	});

	return target.setImage(image).setMimeType('image/png');
}
