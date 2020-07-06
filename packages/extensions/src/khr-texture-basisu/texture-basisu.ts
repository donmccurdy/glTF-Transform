import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_TEXTURE_BASISU } from '../constants';
import { Basisu } from './basisu';

const NAME = KHR_TEXTURE_BASISU;

/** Documentation in {@link EXTENSIONS.md}. */
export class TextureBasisu extends Extension {
	public readonly extensionName = NAME;
	public static readonly EXTENSION_NAME = NAME;

	read(_: ReaderContext): this {
		return this;
	}

	write(context: WriterContext): this {
		const nativeDoc = context.nativeDocument;

		this.doc.getRoot()
			.listTextures()
			.forEach((texture) => {
				if (texture.getExtension(Basisu)) {
					const imageDef = nativeDoc.json.images[context.imageIndexMap.get(texture)];
					imageDef.extensions = imageDef.extensions || {};
					imageDef.extensions[NAME] = {};
					//context.createImageData()
				}
			});

		return this;
	}
}
