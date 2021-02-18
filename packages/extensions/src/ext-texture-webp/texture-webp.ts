import { BufferUtils, Extension, ImageUtils, ImageUtilsFormat, PropertyType, ReaderContext, WriterContext, vec2 } from '@gltf-transform/core';
import { EXT_TEXTURE_WEBP } from '../constants';

const NAME = EXT_TEXTURE_WEBP;

class WEBPImageUtils implements ImageUtilsFormat {
	getSize (buffer: ArrayBuffer): vec2 {
		// Reference: http://tools.ietf.org/html/rfc6386
		const RIFF = BufferUtils.decodeText(buffer.slice(0, 4));
		const WEBP = BufferUtils.decodeText(buffer.slice(8, 12));
		if (RIFF !== 'RIFF' || WEBP !== 'WEBP') return null;

		const view = new DataView(buffer);

		// Reference: https://wiki.tcl-lang.org/page/Reading+WEBP+image+dimensions
		let offset = 12;
		while (offset < buffer.byteLength) {
			const chunkId = BufferUtils.decodeText(buffer.slice(offset, offset + 4));
			const chunkByteLength = view.getUint32(offset + 4, true);
			if (chunkId === 'VP8 ') {
				const width = view.getInt16(offset + 14, true) & 0x3fff;
				const height = view.getInt16(offset + 16, true) & 0x3fff;
				return [width, height];
			} else if (chunkId === 'VP8L') {
				const b0 = view.getUint8(offset + 9);
				const b1 = view.getUint8(offset + 10);
				const b2 = view.getUint8(offset + 11);
				const b3 = view.getUint8(offset + 12);
				const width = 1 + (((b1 & 0x3F) << 8) | b0);
				const height = 1 + (((b3 & 0xF) << 10) | (b2 << 2) | ((b1 & 0xC0) >> 6));
				return [width, height];
			}
			offset += 8 + chunkByteLength + (chunkByteLength % 2);
		}

		return null;
	}
	getChannels (_buffer: ArrayBuffer): number {
		return 4;
	}
}

/** Documentation in {@link EXTENSIONS.md}. */
export class TextureWebP extends Extension {
	public readonly extensionName = NAME;
	public readonly prereadTypes = [PropertyType.TEXTURE];
	public static readonly EXTENSION_NAME = NAME;

	public static register (): void {
		ImageUtils.registerFormat('image/webp', new WEBPImageUtils());
	}

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
