import {
	type Buffer,
	type Document,
	FileUtils,
	ImageUtils,
	type NodeIO,
	PropertyType,
	type Texture,
	type Transform,
} from '@gltf-transform/core';
import { dedup, mergeDocuments, unpartition } from '@gltf-transform/functions';
import fs from 'fs';

const NAME = 'merge';

export interface MergeOptions {
	io: NodeIO;
	paths: string[];
	partition?: boolean;
	mergeScenes?: boolean;
}

const merge = (options: MergeOptions): Transform => {
	const { paths, io } = options;

	return async (document: Document): Promise<void> => {
		const root = document.getRoot();
		const logger = document.getLogger();

		for (let i = 0; i < paths.length; i++) {
			const path = paths[i];

			logger.debug(`Merging ${i + 1} / ${paths.length}, ${path}`);

			const basename = FileUtils.basename(path);
			const extension = FileUtils.extension(path).toLowerCase();
			if (['png', 'jpg', 'jpeg', 'webp', 'ktx2'].includes(extension)) {
				document
					.createTexture(basename)
					.setImage(fs.readFileSync(path))
					.setMimeType(ImageUtils.extensionToMimeType(extension))
					.setURI(basename + '.' + extension);
			} else if (['gltf', 'glb'].includes(extension)) {
				mergeDocuments(document, renameScenes(basename, await io.read(path)));
			} else {
				throw new Error(`Unknown file extension: "${extension}".`);
			}
		}

		const rootScene = root.listScenes()[0];

		for (const scene of document.getRoot().listScenes()) {
			if (scene === rootScene) {
				root.setDefaultScene(rootScene);
				continue;
			}

			if (!options.mergeScenes) continue;

			for (const child of scene.listChildren()) {
				scene.removeChild(child);
				rootScene.addChild(child);
			}

			scene.dispose();
		}

		// De-duplicate textures, then ensure that all remaining textures and buffers
		// have unique URIs. See https://github.com/donmccurdy/glTF-Transform/issues/586.
		await document.transform(dedup({ propertyTypes: [PropertyType.TEXTURE] }));
		createUniqueURIs(document.getRoot().listBuffers());
		createUniqueURIs(document.getRoot().listTextures());

		if (!options.partition) {
			await document.transform(unpartition());
		}

		logger.debug(`${NAME}: Complete.`);
	};
};

function renameScenes(name: string, document: Document): Document {
	const scenes = document.getRoot().listScenes();

	for (let i = 0; i < scenes.length; i++) {
		if (!scenes[i].getName()) {
			scenes[i].setName(name + (scenes.length > 1 ? ` (${i + 1}/${scenes.length})` : ''));
		}
	}

	return document;
}

/** Replaces conflicting URIs to ensure all URIs are unique. */
function createUniqueURIs(resources: Buffer[] | Texture[]): void {
	const total = {} as Record<string, number>;
	const used = {} as Record<string, boolean>;

	for (const resource of resources) {
		const uri = resource.getURI();
		if (!uri) continue;
		if (!total[uri]) total[uri] = 0;
		total[uri]++;
		used[uri] = false;
	}

	for (const resource of resources) {
		let uri = resource.getURI();
		if (!uri || total[uri] === 1) continue;

		const extension = FileUtils.extension(uri);
		const prefix = uri.replace(new RegExp(`\\.${extension}`), '');
		for (let i = 2; used[uri]; i++) {
			uri = `${prefix}_${i++}.${extension}`;
		}
		resource.setURI(uri);
		used[uri] = true;
	}
}

export { merge };
