import { KHR_DF_PRIMARIES_BT709, KHR_DF_PRIMARIES_UNSPECIFIED, read, write } from 'ktx-parse';
import type { Document, Transform } from '@gltf-transform/core';
import { getTextureColorSpace, listTextureSlots } from '@gltf-transform/functions';

const NAME = 'ktxfix';

export function ktxfix(): Transform {
	return async (doc: Document): Promise<void> => {
		const logger = doc.getLogger();

		let numChanged = 0;

		for (const texture of doc.getRoot().listTextures()) {
			if (texture.getMimeType() !== 'image/ktx2') continue;

			const image = texture.getImage();
			if (!image) continue;

			const ktx = read(image);
			const dfd = ktx.dataFormatDescriptor[0];
			const slots = listTextureSlots(texture);

			// Don't make changes if we have no information.
			if (slots.length === 0) continue;

			const colorSpace = getTextureColorSpace(texture);
			const colorPrimaries = colorSpace === 'srgb' ? KHR_DF_PRIMARIES_BT709 : KHR_DF_PRIMARIES_UNSPECIFIED;
			const name = texture.getURI() || texture.getName();

			let changed = false;

			// See: https://github.com/donmccurdy/glTF-Transform/issues/218
			if (dfd.colorPrimaries !== colorPrimaries) {
				dfd.colorPrimaries = colorPrimaries;
				logger.info(`${NAME}: Set colorPrimaries=${colorPrimaries} for texture "${name}"`);
				changed = true;
			}

			if (changed) {
				texture.setImage(write(ktx));
				numChanged++;
			}
		}

		logger.info(`${NAME}: Found and repaired issues in ${numChanged} textures`);
		logger.debug(`${NAME}: Complete.`);
	};
}
