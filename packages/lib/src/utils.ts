import getPixels from 'get-pixels';
import ndarray from 'ndarray';
import savePixels from 'save-pixels';
import { BufferUtils, Primitive, Texture } from '@gltf-transform/core';

/** Maps pixels from source to target textures, with a per-pixel callback. */
export async function rewriteTexture(
		source: Texture,
		target: Texture,
		fn: (pixels: ndarray, i: number, j: number) => void): Promise<Texture|null> {

	if (!source) return null;

	const pixels: ndarray = await new Promise((resolve, reject) => {
		// eslint-disable-next-line @typescript-eslint/ban-types
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

export function getGLPrimitiveCount(prim: Primitive): number {
	// Reference: https://www.khronos.org/opengl/wiki/Primitive
	switch (prim.getMode()) {
		case Primitive.Mode.POINTS:
			return prim.getAttribute('POSITION').getCount();
		case Primitive.Mode.LINES:
			return prim.getIndices()
				? prim.getIndices().getCount() / 2
				: prim.getAttribute('POSITION').getCount() / 2;
		case Primitive.Mode.LINE_LOOP:
			return prim.getAttribute('POSITION').getCount();
		case Primitive.Mode.LINE_STRIP:
			return prim.getAttribute('POSITION').getCount() - 1;
		case Primitive.Mode.TRIANGLES:
			return prim.getIndices()
				? prim.getIndices().getCount() / 3
				: prim.getAttribute('POSITION').getCount() / 3;
		case Primitive.Mode.TRIANGLE_STRIP:
		case Primitive.Mode.TRIANGLE_FAN:
			return prim.getAttribute('POSITION').getCount() - 2;
		default:
			throw new Error('Unexpected mode: ' + prim.getMode());
	}
}
