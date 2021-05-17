import { NdArray } from 'ndarray';
import { getPixels, savePixels } from 'ndarray-pixels';
import { Primitive, Texture } from '@gltf-transform/core';

/** Maps pixels from source to target textures, with a per-pixel callback. */
export async function rewriteTexture(
		source: Texture,
		target: Texture,
		fn: (pixels: NdArray, i: number, j: number) => void): Promise<Texture|null> {

	if (!source) return null;

	const srcImage = source.getImage();
	if (!srcImage) return null;

	const pixels = await getPixels(new Uint8Array(srcImage), source.getMimeType());

	for(let i = 0; i < pixels.shape[0]; ++i) {
		for(let j = 0; j < pixels.shape[1]; ++j) {
			fn(pixels, i, j);
		}
	}

	const dstImage = (await savePixels(pixels, 'image/png')).buffer;
	return target.setImage(dstImage).setMimeType('image/png');
}

export function getGLPrimitiveCount(prim: Primitive): number {
	const indices = prim.getIndices();
	const position = prim.getAttribute('POSITION')!;

	// Reference: https://www.khronos.org/opengl/wiki/Primitive
	switch (prim.getMode()) {
		case Primitive.Mode.POINTS:
			return position.getCount();
		case Primitive.Mode.LINES:
			return indices
				? indices.getCount() / 2
				: position.getCount() / 2;
		case Primitive.Mode.LINE_LOOP:
			return position.getCount();
		case Primitive.Mode.LINE_STRIP:
			return position.getCount() - 1;
		case Primitive.Mode.TRIANGLES:
			return indices
				? indices.getCount() / 3
				: position.getCount() / 3;
		case Primitive.Mode.TRIANGLE_STRIP:
		case Primitive.Mode.TRIANGLE_FAN:
			return position.getCount() - 2;
		default:
			throw new Error('Unexpected mode: ' + prim.getMode());
	}
}
