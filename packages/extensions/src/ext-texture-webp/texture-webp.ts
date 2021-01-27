import { Extension, PropertyType, ReaderContext, WriterContext } from '@gltf-transform/core';
import { EXT_TEXTURE_WEBP } from '../constants';

const NAME = EXT_TEXTURE_WEBP;

/** Documentation in {@link EXTENSIONS.md}. */
export class TextureWebP extends Extension {
	public readonly extensionName = NAME;
	public readonly prereadTypes = [PropertyType.TEXTURE];
	public static readonly EXTENSION_NAME = NAME;

	public preread(context: ReaderContext): this {
		const textureDefs = context.jsonDoc.json.textures || [];
		textureDefs.forEach((textureDef) => {
			if (textureDef.extensions && textureDef.extensions[NAME]) {
				textureDef.source = (textureDef.extensions[NAME] as {source: number}).source;
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
				if (texture.getMimeType() === 'image/webp') {
					const imageIndex = context.imageIndexMap.get(texture);
					const textureDefs = jsonDoc.json.textures || [];
					textureDefs.forEach((textureDef) => {
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
