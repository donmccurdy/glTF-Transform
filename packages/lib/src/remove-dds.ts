import { Document, Texture } from '@gltf-transform/core';
import { TextureDDS } from '@gltf-transform/extensions';
import { DDSDecoder } from '@imgdrop/dds';

const NAME = 'removeDDS';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface RemoveDDSOptions {}

/**
 * Converts a spec/gloss PBR workflow to a metal/rough PBR workflow, relying on the IOR and
 * specular extensions to base glTF 2.0.
 */
export function removeDDS (options: RemoveDDSOptions = {}) {

	return async (doc: Document): Promise<void> => {

		const logger = doc.getLogger();

		const extensionName = TextureDDS.EXTENSION_NAME;
		const extensionsUsed = doc.getRoot().listExtensionsUsed().map((ext) => ext.extensionName);
		if (!extensionsUsed.includes(extensionName)) {
			logger.warn(`${NAME}: Extension ${extensionName} not found on given document.`);
			return;
		}

		doc.getRoot().listTextures().forEach((texture) => {
			if (texture.getMimeType() !== 'image/vnd-ms.dds') return;

			const decoder = new DDSDecoder((_) => texture.getImage());
			decoder.decode();
			console.log('Decoded: ', decoder.width, decoder.height, decoder.data);
		});

		logger.debug(`${NAME}: Complete.`);

	};

}
