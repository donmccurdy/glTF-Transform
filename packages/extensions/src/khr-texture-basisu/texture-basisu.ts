import { read as readKTX } from 'ktx-parse';
import { Extension, ImageUtils, ImageUtilsFormat, PropertyType, ReaderContext, WriterContext, vec2 } from '@gltf-transform/core';
import { KHR_TEXTURE_BASISU } from '../constants';

const NAME = KHR_TEXTURE_BASISU;

class KTX2ImageUtils implements ImageUtilsFormat {
	getSize (buffer: ArrayBuffer): vec2 {
		const container = readKTX(new Uint8Array(buffer));
		return [container.pixelWidth, container.pixelHeight];
	}
	getChannels (buffer: ArrayBuffer): number {
		const container = readKTX(new Uint8Array(buffer));
		const dfd = container.dataFormatDescriptor[0];
		if (dfd.colorModel === 163 /* ETC1S */) {
			return (dfd.samples.length === 2 && (dfd.samples[1].channelID & 0xF) === 15) ? 4 : 3;
		} else if (dfd.colorModel === 166 /* UASTC */) {
			return (dfd.samples[0].channelID & 0xF) === 3 ? 4 : 3;
		} else {
			throw new Error(`Unexpected KTX2 colorModel, "${dfd.colorModel}".`);
		}
		return 4;
	}
	getGPUByteLength (buffer: ArrayBuffer): number {
		const container = readKTX(new Uint8Array(buffer));
		const hasAlpha = this.getChannels(buffer) > 3;

		let uncompressedBytes = 0;
		for (let i = 0; i < container.levels.length; i++) {
			const level = container.levels[i];

			// Use level.uncompressedByteLength for UASTC; for ETC1S it's 0.
			if (level.uncompressedByteLength) {
				uncompressedBytes += level.uncompressedByteLength;
			} else {
				const levelWidth = Math.max(1, Math.floor(container.pixelWidth / Math.pow(2, i)));
				const levelHeight = Math.max(1, Math.floor(container.pixelHeight / Math.pow(2, i)));
				const blockSize = hasAlpha ? 16 : 8;
				uncompressedBytes += (levelWidth / 4) * (levelHeight / 4) * blockSize;
			}
		}

		return uncompressedBytes;
	}
}

/** Documentation in {@link EXTENSIONS.md}. */
export class TextureBasisu extends Extension {
	public readonly extensionName = NAME;
	public readonly prereadTypes = [PropertyType.TEXTURE];
	public static readonly EXTENSION_NAME = NAME;

	public static register (): void {
		ImageUtils.registerFormat('image/ktx2', new KTX2ImageUtils());
	}

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
