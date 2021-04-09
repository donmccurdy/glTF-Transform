import { KTX2Primaries, read, write } from 'ktx-parse'; // TODO(dependency)
import { Document, Transform } from '@gltf-transform/core';
import { getTextureSlots, isTextureLinear } from '../util';

const NAME = 'ktxfix';

export function ktxfix (): Transform {
	return async (doc: Document): Promise<void> => {
		const logger = doc.getLogger();

		let numChanged = 0;

		for (const texture of doc.getRoot().listTextures()) {
			if (texture.getMimeType() !== 'image/ktx2') continue;

			const ktx = read(new Uint8Array(texture.getImage()));
			const dfd = ktx.dataFormatDescriptor[0];
			const isLinear = isTextureLinear(getTextureSlots(doc, texture));
			const colorPrimaries = isLinear ? KTX2Primaries.UNSPECIFIED : KTX2Primaries.SRGB;
			const name = texture.getURI() || texture.getName();

			let changed = false;

			// See: https://github.com/donmccurdy/glTF-Transform/issues/218
			if (dfd.colorPrimaries !== colorPrimaries) {
				dfd.colorPrimaries = colorPrimaries;
				logger.info(`${NAME}: Set colorPrimaries=${colorPrimaries} for texture "${name}"`);
				changed = true;
			}

			if (changed) {
				texture.setImage(write(ktx).buffer);
				numChanged++;
			}
		}

		logger.info(`${NAME}: Found and repaired issues in ${numChanged} textures`);
		logger.debug(`${NAME}: Complete.`);
	};
}
