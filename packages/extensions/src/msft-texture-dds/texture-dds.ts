import { Extension, PropertyType, ReaderContext, WriterContext } from '@gltf-transform/core';
import { MSFT_TEXTURE_DDS } from '../constants';

const NAME = MSFT_TEXTURE_DDS;

/** Documentation in {@link EXTENSIONS.md}. */
export class TextureDDS extends Extension {
	public readonly extensionName = NAME;
	public readonly provideTypes = [PropertyType.TEXTURE];
	public static readonly EXTENSION_NAME = NAME;

	public provide(context: ReaderContext): this {
		context.nativeDocument.json.textures.forEach((textureDef) => {
			if (textureDef.extensions && textureDef.extensions[NAME]) {
				textureDef.source = textureDef.extensions[NAME].source;
			}
		});
		return this;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public read(context: ReaderContext): this {
		return this;
	}

	public write(context: WriterContext): this {
		const nativeDoc = context.nativeDocument;

		this.doc.getRoot()
			.listTextures()
			.forEach((texture) => {
				if (texture.getMimeType() === 'image/vnd-ms.dds') {
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
