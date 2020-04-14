import { ImageUtils, Size } from '../utils';
import { Element } from './element';

/**
 * @category Elements
 */
export class Texture extends Element {
	/** Raw image data for this texture. */
	private image: ArrayBuffer = null;

	/** Image MIME type. Required if URI is not set. */
	private mimeType = '';

	/** Image URI. Required if MIME type is not set. */
	private uri = '';

	public getImage(): ArrayBuffer { return this.image; }
	public setImage(image: ArrayBuffer): Texture {
		this.image = image;
		return this;
	}

	public getMimeType(): string { return this.mimeType; }
	public setMimeType(mimeType: string): Texture {
		this.mimeType = mimeType;
		return this;
	}

	public getURI(): string {
		return this.uri;
	}
	public setURI(uri: string): Texture {
		this.uri = uri;
		return this;
	}

	public getSize(): Size {
		let isPNG;
		if (this.mimeType) {
			isPNG = this.mimeType === 'image/png';
		} else {
			isPNG = this.uri.match(/\.png$/);
		}
		return isPNG
			? ImageUtils.getSizePNG(Buffer.from(this.image))
			: ImageUtils.getSizeJPEG(Buffer.from(this.image));
	}
}

/**
 * @category Elements
 */
export class TextureInfo {
	private texCoord = 0;
	private magFilter: GLTF.TextureMagFilter = null;
	private minFilter: GLTF.TextureMinFilter = null;
	private wrapS: GLTF.TextureWrapMode = GLTF.TextureWrapMode.REPEAT;
	private wrapT: GLTF.TextureWrapMode = GLTF.TextureWrapMode.REPEAT;

	public getTexCoord(): number { return this.texCoord; }
	public setTexCoord(texCoord: number): TextureInfo {
		this.texCoord = texCoord;
		return this;
	}

	public getMagFilter(): GLTF.TextureMagFilter { return this.magFilter; }
	public setMagFilter(magFilter: GLTF.TextureMagFilter): TextureInfo {
		this.magFilter = magFilter;
		return this;
	}

	public getMinFilter(): GLTF.TextureMinFilter { return this.minFilter; }
	public setMinFilter(minFilter: GLTF.TextureMinFilter): TextureInfo {
		this.minFilter = minFilter;
		return this;
	}

	public getWrapS(): GLTF.TextureWrapMode { return this.wrapS; }
	public setWrapS(wrapS: GLTF.TextureWrapMode): TextureInfo {
		this.wrapS = wrapS;
		return this;
	}

	public getWrapT(): GLTF.TextureWrapMode { return this.wrapT; }
	public setWrapT(wrapT: GLTF.TextureWrapMode): TextureInfo {
		this.wrapT = wrapT;
		return this;
	}
}
