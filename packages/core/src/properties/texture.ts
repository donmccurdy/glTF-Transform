import { vec2 } from '../constants';
import { ImageUtils } from '../utils';
import { Property } from './property';

/**
 * # Texture
 *
 * *Texture, or images, referenced by {@link Material} properties.*
 *
 * Textures in glTF-Transform are a combination of glTF's `texture` and `image` properties, and
 * should be unique within a document, such that no other texture contains the same
 * {@link getImage}() data. Where duplicates may already exist, the `prune({textures: true})`
 * transform can remove them. A {@link Document} with N texture properties will be exported to a
 * glTF file with N `image` properties, and the minimum number of `texture` properties necessary
 * for the materials that use it.
 *
 * For properties associated with a particular _use_ of a texture, see {@link TextureInfo} and
 * {@link TextureSampler}.
 *
 * Reference:
 * - [glTF → Textures](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#textures)
 * - [glTF → Images](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#images)
 *
 * @category Properties
 */
export class Texture extends Property {
	public readonly propertyType = 'Texture';

	/** Raw image data for this texture. */
	private image: ArrayBuffer = null;

	/** Image MIME type. Required if URI is not set. */
	private mimeType = '';

	/** Image URI. Required if MIME type is not set. */
	private uri = '';

	/**********************************************************************************************
	 * MIME type / format.
	 */

	/** Returns the MIME type for this texture ('image/jpeg' or 'image/png'). */
	public getMimeType(): string { return this.mimeType; }

	/**
	 * Sets the MIME type for this texture ('image/jpeg' or 'image/png'). If the texture does not
	 * have a URI, a MIME type is required for correct export.
	 */
	public setMimeType(mimeType: string): this {
		this.mimeType = mimeType;
		return this;
	}

	/**********************************************************************************************
	 * URI / filename.
	 */

	/** Returns the URI (e.g. 'path/to/file.png') for this texture. */
	public getURI(): string {
		return this.uri;
	}

	/**
	 * Sets the URI (e.g. 'path/to/file.png') for this texture. If the texture does not have a MIME
	 * type, a URI is required for correct export.
	 */
	public setURI(uri: string): this {
		this.uri = uri;
		return this;
	}

	/**********************************************************************************************
	 * Image data.
	 */

	/** Returns the raw image data for this texture. */
	public getImage(): ArrayBuffer { return this.image; }

	/** Sets the raw image data for this texture. */
	public setImage(image: ArrayBuffer): this {
		this.image = image;
		return this;
	}

	/** Returns the size, in pixels, of this texture. */
	public getSize(): vec2 {
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
 * # TextureInfo
 *
 * *Settings associated with a particular use of a {@link Texture}.*
 *
 * Different materials may reuse the same texture but with different texture coordinates. For other
 * settings affecting application of a texture, see {@link TextureSampler}.
 *
 * References:
 * - [glTF → Texture Info](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#reference-textureinfo)
 *
 * @category Properties
 */
export class TextureInfo {
	public readonly propertyType = 'TextureInfo';

	private texCoord = 0;

	/** Returns the texture coordinate (UV set) index for the texture. */
	public getTexCoord(): number { return this.texCoord; }

	/** Sets the texture coordinate (UV set) index for the texture. */
	public setTexCoord(texCoord: number): this {
		this.texCoord = texCoord;
		return this;
	}
}

/**
 * # TextureSampler
 *
 * *Settings associated with a particular use of a {@link Texture}.*
 *
 * Different materials may reuse the same texture but with different texture coordinates. For other
 * settings affecting application of a texture, see {@link TextureInfo}.
 *
 * References:
 * - [glTF → Samplers](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#samplers)
 *
 * @category Properties
 */
export class TextureSampler {
	public readonly propertyType = 'TextureSampler';

	private magFilter: GLTF.TextureMagFilter = null;
	private minFilter: GLTF.TextureMinFilter = null;
	private wrapS: GLTF.TextureWrapMode = GLTF.TextureWrapMode.REPEAT;
	private wrapT: GLTF.TextureWrapMode = GLTF.TextureWrapMode.REPEAT;

	/** UV wrapping mode. Values correspond to WebGL enums. */
	public static TextureWrapMode = {
		CLAMP_TO_EDGE: GLTF.TextureWrapMode.CLAMP_TO_EDGE,
		MIRRORED_REPEAT: GLTF.TextureWrapMode.MIRRORED_REPEAT,
		REPEAT: GLTF.TextureWrapMode.REPEAT,
	}

	/** Magnification filter. Values correspond to WebGL enums. */
	public static TextureMagFilter = {
		NEAREST: GLTF.TextureMagFilter.NEAREST,
		LINEAR: GLTF.TextureMagFilter.LINEAR,
	}

	/** Minification filter. Values correspond to WebGL enums. */
	public static TextureMinFilter = {
		NEAREST: GLTF.TextureMinFilter.NEAREST,
		LINEAR: GLTF.TextureMinFilter.LINEAR,
		NEAREST_MIPMAP_NEAREST: GLTF.TextureMinFilter.NEAREST_MIPMAP_NEAREST,
		LINEAR_MIPMAP_NEAREST: GLTF.TextureMinFilter.LINEAR_MIPMAP_NEAREST,
		NEAREST_MIPMAP_LINEAR: GLTF.TextureMinFilter.NEAREST_MIPMAP_LINEAR,
		LINEAR_MIPMAP_LINEAR: GLTF.TextureMinFilter.LINEAR_MIPMAP_LINEAR,
	}

	/**********************************************************************************************
	 * Min/mag filter.
	 */

	/** Returns the magnification filter applied to the texture. */
	public getMagFilter(): GLTF.TextureMagFilter { return this.magFilter; }

	/** Sets the magnification filter applied to the texture. */
	public setMagFilter(magFilter: GLTF.TextureMagFilter): this {
		this.magFilter = magFilter;
		return this;
	}

	/** Sets the minification filter applied to the texture. */
	public getMinFilter(): GLTF.TextureMinFilter { return this.minFilter; }

	/** Returns the minification filter applied to the texture. */
	public setMinFilter(minFilter: GLTF.TextureMinFilter): this {
		this.minFilter = minFilter;
		return this;
	}

	/**********************************************************************************************
	 * UV wrapping.
	 */

	/** Returns the S (U) wrapping mode for UVs used by the texture. */
	public getWrapS(): GLTF.TextureWrapMode { return this.wrapS; }

	/** Sets the S (U) wrapping mode for UVs used by the texture. */
	public setWrapS(wrapS: GLTF.TextureWrapMode): this {
		this.wrapS = wrapS;
		return this;
	}

	/** Returns the T (V) wrapping mode for UVs used by the texture. */
	public getWrapT(): GLTF.TextureWrapMode { return this.wrapT; }

	/** Sets the T (V) wrapping mode for UVs used by the texture. */
	public setWrapT(wrapT: GLTF.TextureWrapMode): this {
		this.wrapT = wrapT;
		return this;
	}
}
