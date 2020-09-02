import * as fs from 'fs';
import { BufferUtils, Document, FileUtils, ImageUtils, NodeIO, Transform } from '@gltf-transform/core';

const NAME = 'merge';

export interface MergeOptions {
	io: NodeIO;
	paths: string[];
	partition: boolean;
}

const merge = (options: MergeOptions): Transform => {

	const {paths, io} = options;

	return (doc: Document): void => {

		const logger = doc.getLogger();

		options.paths.forEach((path, index) => {
			logger.debug(`Merging ${index + 1} / ${paths.length}, ${path}`);

			const basename = FileUtils.basename(path);
			const extension = FileUtils.extension(path);
			if (['png', 'jpeg', 'ktx2'].includes(extension)) {
				doc.createTexture(basename)
					.setImage(BufferUtils.trim(fs.readFileSync(path)))
					.setMimeType(ImageUtils.extensionToMimeType(extension))
					.setURI(basename + '.' + extension);
			} else {
				doc.merge(io.read(path));
			}
		});

		if (!options.partition) {
			const buffer = doc.getRoot().listBuffers()[0];
			doc.getRoot().listAccessors().forEach((a) => a.setBuffer(buffer));
			doc.getRoot().listBuffers().forEach((b, index) => index > 0 ? b.dispose() : null);
		}

		logger.debug(`${NAME}: Complete.`);
	};

}




export { merge };
