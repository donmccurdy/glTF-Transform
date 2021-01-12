import { Extension, PropertyType, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_TEXTURE_BASISU } from '../constants';

const NAME = KHR_TEXTURE_BASISU;

/** Documentation in {@link EXTENSIONS.md}. */
export class TextureBasisu extends Extension {
	public readonly extensionName = NAME;
	public readonly prereadTypes = [PropertyType.TEXTURE];
	public static readonly EXTENSION_NAME = NAME;

	public preread(context: ReaderContext): this {
		context.jsonDoc.json.textures.forEach((textureDef) => {
			if (textureDef.extensions && textureDef.extensions[NAME]) {
				textureDef.source = textureDef.extensions[NAME]['source'];
			}
		});
		return this;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public read(context: ReaderContext): this {
		return this;
	}

	public write(context: WriterContext): this {
		const jsonDoc = context.jsonDoc;

		this.doc.getRoot()
			.listTextures()
			.forEach((texture) => {
				if (texture.getMimeType() === 'image/ktx2') {
					const imageIndex = context.imageIndexMap.get(texture);
					jsonDoc.json.textures.forEach((textureDef) => {
						if (textureDef.source === imageIndex) {
							textureDef.extensions = textureDef.extensions || {};
							textureDef.extensions[NAME] = {source: textureDef.source};
							delete textureDef.source;
						}
					});
				}
			});

		return this;
	}
}
