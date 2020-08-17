import * as getPixelsNamespace from 'get-pixels';
import * as ndarray from 'ndarray';
import * as savePixelsNamespace from 'save-pixels';
import { BufferUtils, Document, Texture } from '@gltf-transform/core';

const getPixels = getPixelsNamespace['default'] as Function;
const savePixels = savePixelsNamespace['default'] as Function;

export async function rewriteTexture(doc: Document, input: Texture, fn: (pixels: ndarray, i: number, j: number) => void): Promise<Texture> {
	if (!input) return null;

	const pixels: ndarray = await new Promise((resolve, reject) => {
		(getPixels as unknown as Function)(
			Buffer.from(input.getImage()),
			input.getMimeType(),
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

	return doc.createTexture('')
		.setMimeType('image/png')
		.setImage(image);
}
