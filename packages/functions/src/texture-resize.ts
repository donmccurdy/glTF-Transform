import ndarray from 'ndarray';
import { lanczos2, lanczos3 } from 'ndarray-lanczos';
import { getPixels, savePixels } from 'ndarray-pixels';
import { Document, Transform, vec2 } from '@gltf-transform/core';

const NAME = 'textureResize';

/** Options for the {@link textureResize} function. */
export interface TextureResizeOptions {
	/**
	 * Maximum width/height to enforce, preserving aspect ratio. For example,
	 * a 4096x8192 texture, resized with limit [2048, 2048] will be reduced
	 * to 1024x2048.
	 */
	size: vec2;
	/** Resampling filter method. LANCZOS3 is sharper, LANCZOS2 is smoother. */
	filter?: TextureResizeFilter;
	/** Pattern identifying textures to resize, matched to name or URI. */
	pattern?: RegExp | null;
}

/** Resampling filter methods. LANCZOS3 is sharper, LANCZOS2 is smoother. */
export enum TextureResizeFilter {
	/** Lanczos3 (sharp) */
	LANCZOS3 = 'lanczos3',
	/** Lanczos2 (smooth) */
	LANCZOS2 = 'lanczos2',
}

export const TEXTURE_RESIZE_DEFAULTS: TextureResizeOptions = {
	size: [2048, 2048],
	filter: TextureResizeFilter.LANCZOS3,
	pattern: null
};

/**
 * Resize PNG or JPEG {@link Texture Textures}, with {@link https://en.wikipedia.org/wiki/Lanczos_algorithm Lanczos filtering}.
 * Implementation provided by {@link https://github.com/donmccurdy/ndarray-lanczos ndarray-lanczos} package.
 */
export function textureResize(_options: TextureResizeOptions = TEXTURE_RESIZE_DEFAULTS): Transform {
	const options = {...TEXTURE_RESIZE_DEFAULTS, ..._options} as Required<TextureResizeOptions>;

	return async (doc: Document): Promise<void> => {

		const logger = doc.getLogger();

		for (const texture of doc.getRoot().listTextures()) {
			const name = texture.getName();
			const uri = texture.getURI();
			const match = !options.pattern
				|| options.pattern.test(name)
				|| options.pattern.test(uri);
			if (!match) continue;

			if (texture.getMimeType() !== 'image/png' && texture.getMimeType() !== 'image/jpeg') {
				logger.warn(`Skipping unsupported texture type, "${texture.getMimeType()}".`);
				continue;
			}

			const [maxWidth, maxHeight] = options.size;
			const [srcWidth, srcHeight] = texture.getSize()!;

			if (srcWidth <= maxWidth && srcHeight <= maxHeight) {
				logger.debug(`${NAME}: Skipping "${uri || name}", within size range.`);
				continue;
			}

			let dstWidth = srcWidth;
			let dstHeight = srcHeight;

			if (dstWidth > maxWidth) {
				dstHeight = Math.floor(dstHeight * (maxWidth / dstWidth));
				dstWidth = maxWidth;
			}

			if (dstHeight > maxHeight) {
				dstWidth = Math.floor(dstWidth * (maxHeight / dstHeight));
				dstHeight = maxHeight;
			}

			const srcImage = new Uint8Array(texture.getImage() as ArrayBuffer);
			const srcPixels = await getPixels(srcImage, texture.getMimeType());
			const dstPixels = ndarray(
				new Uint8Array(dstWidth * dstHeight * 4), [dstWidth, dstHeight, 4]
			);

			logger.debug(
				`${NAME}: Resizing "${uri || name}", ${srcPixels.shape} → ${dstPixels.shape}...`
			);

			try {
				options.filter === TextureResizeFilter.LANCZOS3
					? lanczos3(srcPixels, dstPixels)
					: lanczos2(srcPixels, dstPixels);
			} catch (e) {
				if (e instanceof Error) {
					logger.warn(`${NAME}: Failed to resize "${uri || name}": "${e.message}".`);
					continue;
				}
				throw e;
			}

			texture.setImage((await savePixels(dstPixels, texture.getMimeType())).buffer);
		}

		logger.debug(`${NAME}: Complete.`);

	};

}
