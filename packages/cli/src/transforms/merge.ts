import fs from 'fs';
import { Document, FileUtils, ImageUtils, NodeIO, Transform } from '@gltf-transform/core';
import { unpartition } from '@gltf-transform/functions';

const NAME = 'merge';

export interface MergeOptions {
	io: NodeIO;
	paths: string[];
	partition: boolean;
}

const merge = (options: MergeOptions): Transform => {
	const { paths, io } = options;

	return async (doc: Document): Promise<void> => {
		const logger = doc.getLogger();

		for (let i = 0; i < paths.length; i++) {
			const path = paths[i];

			logger.debug(`Merging ${i + 1} / ${paths.length}, ${path}`);

			const basename = FileUtils.basename(path);
			const extension = FileUtils.extension(path).toLowerCase();
			if (['png', 'jpg', 'jpeg', 'webp', 'ktx2'].includes(extension)) {
				doc.createTexture(basename)
					.setImage(fs.readFileSync(path))
					.setMimeType(ImageUtils.extensionToMimeType(extension))
					.setURI(basename + '.' + extension);
			} else if (['gltf', 'glb'].includes(extension)) {
				doc.merge(await io.read(path));
			} else {
				throw new Error(`Unknown file extension: "${extension}".`);
			}
		}

		if (!options.partition) {
			await doc.transform(unpartition());
		}

		logger.debug(`${NAME}: Complete.`);
	};
};

export { merge };
