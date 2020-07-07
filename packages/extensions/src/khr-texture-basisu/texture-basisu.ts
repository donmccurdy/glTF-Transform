import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_TEXTURE_BASISU } from '../constants';

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
				if (texture.getMimeType() === 'image/ktx2') {
					const imageIndex = context.imageIndexMap.get(texture);
					nativeDoc.json.textures.forEach((textureDef) => {
						if (textureDef.source === imageIndex) {
							textureDef.extensions = textureDef.extensions || {}
							textureDef.extensions[NAME] = {source: textureDef.source};
							delete textureDef.source;
						}
					});
				}
			});

		return this;
	}
}
