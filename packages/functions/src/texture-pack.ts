import { getPixels } from 'ndarray-pixels';
import { Document, Root, Texture, TextureChannel, Transform } from '@gltf-transform/core';
import type { Clearcoat } from '@gltf-transform/extensions';
import { createTransform, rewriteTexture } from './utils';
import { getTextureChannelMask } from './list-texture-channels';

const NAME = 'texturePack';

const { R, G, B, A } = TextureChannel;

/** Options for the {@link texturePack} function. */
export interface TexturePackOptions {
	/** Pattern identifying textures to pack, matched to name or URI. */
	pattern?: RegExp | null;
	/** Pattern to match slots usage for packing. */
	slots?: RegExp | null;
}

export const TEXTURE_PACK_DEFAULTS: TexturePackOptions = {
	pattern: null,
	slots: null,
};

/**
 * Packs textures with compatible RGBA channel usage.
 */
export function texturePack(_options: TexturePackOptions = TEXTURE_PACK_DEFAULTS): Transform {
	const options = { ...TEXTURE_PACK_DEFAULTS, ..._options } as Required<TexturePackOptions>;

	return createTransform(NAME, async (doc: Document): Promise<void> => {
		const logger = doc.getLogger();

		// TODO(feat): Depending on whether we're optimizing for shader complexity, GPU memory,
		// or both, we could pack textures that *don't* belong to the same materials as well.
		for (const material of doc.getRoot().listMaterials()) {
			const textureSet = new Set<Texture>();

			// TODO(feat): What other cases should be packed?
			const clearcoat = material.getExtension<Clearcoat>('KHR_materials_clearcoat');
			if (!clearcoat) continue;

			const texture = clearcoat.getClearcoatTexture()!;
			const normalTexture = clearcoat.getClearcoatNormalTexture()!;
			const roughnessTexture = clearcoat.getClearcoatRoughnessTexture()!;
			if (texture) textureSet.add(texture);
			if (normalTexture) textureSet.add(normalTexture);
			if (roughnessTexture) textureSet.add(roughnessTexture);

			// Remove textures from the packing set if they already contain
			// data in channels we want to overwrite.
			let packingMask = 0;
			for (const srcTexture of Array.from(textureSet)) {
				const srcMask = getTextureChannelMask(srcTexture);
				if (packingMask & srcMask) {
					textureSet.delete(srcTexture);
				} else {
					packingMask |= srcMask;
				}
			}

			// Exit if we don't have at least 2 textures to pack.
			if (textureSet.size <= 1) continue;

			// TODO(feat): Handle varying resolution and MIME type, or exit?
			const dstTexture = texture || normalTexture || roughnessTexture;

			for (const srcTexture of textureSet) {
				const srcPixels = await getPixels(srcTexture.getImage()!);
				const srcMask = getTextureChannelMask(srcTexture);

				// Pack srcTexture into dstTexture.
				rewriteTexture(dstTexture, dstTexture, (dstPixels, i, j) => {
					if (srcMask & R) dstPixels.set(i, j, 0, srcPixels.get(i, j, 0));
					if (srcMask & G) dstPixels.set(i, j, 1, srcPixels.get(i, j, 1));
					if (srcMask & B) dstPixels.set(i, j, 2, srcPixels.get(i, j, 2));
					if (srcMask & A) dstPixels.set(i, j, 3, srcPixels.get(i, j, 3));
				});

				// Replace all references to srcTexture with dstTexture.
				srcTexture
					.listParents()
					.filter((parent) => !(parent instanceof Root))
					.forEach((parent) => parent.swap(srcTexture, dstTexture));

				// Dispose srcTexture.
				srcTexture.dispose();
			}
		}

		logger.debug(`${NAME}: Complete.`);
	});
}
