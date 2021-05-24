import { PropertyType, vec2 } from '../constants';
import { FileUtils, ImageUtils } from '../utils';
import { ExtensibleProperty } from './extensible-property';
import { COPY_IDENTITY } from './property';

/**
 * # Texture
 *
 * *Texture, or images, referenced by {@link Material} properties.*
 *
 * Textures in glTF-Transform are a combination of glTF's `texture` and `image` properties, and
 * should be unique within a document, such that no other texture contains the same
 * {@link getImage}() data. Where duplicates may already exist, the `dedup({textures: true})`
 * transform can remove them. A {@link Document} with N texture properties will be exported to a
 * glTF file with N `image` properties, and the minimum number of `texture` properties necessary
 * for the materials that use it.
 *
 * For properties associated with a particular _use_ of a texture, see {@link TextureInfo}.
 *
 * Reference:
 * - [glTF → Textures](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#textures)
 * - [glTF → Images](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#images)
 *
 * @category Properties
 */
export class Texture extends ExtensibleProperty {
	public readonly propertyType = PropertyType.TEXTURE;

	/** @internal Raw image data for this texture. */
	private _image: ArrayBuffer | null = null;

	/** @internal Image MIME type. Required if URI is not set. */
	private _mimeType = '';

	/** @internal Image URI. Required if MIME type is not set. */
	private _uri = '';

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this._mimeType = other._mimeType;
		this._uri = other._uri;

		if (other._image) this._image = other._image.slice(0);

		return this;
	}

	/**********************************************************************************************
	 * MIME type / format.
	 */

	/** Returns the MIME type for this texture ('image/jpeg' or 'image/png'). */
	public getMimeType(): string {
		return this._mimeType || ImageUtils.extensionToMimeType(FileUtils.extension(this._uri));
	}

	/**
	 * Sets the MIME type for this texture ('image/jpeg' or 'image/png'). If the texture does not
	 * have a URI, a MIME type is required for correct export.
	 */
	public setMimeType(mimeType: string): this {
		this._mimeType = mimeType;
		return this;
	}

	/**********************************************************************************************
	 * URI / filename.
	 */

	/** Returns the URI (e.g. 'path/to/file.png') for this texture. */
	public getURI(): string {
		return this._uri;
	}

	/**
	 * Sets the URI (e.g. 'path/to/file.png') for this texture. If the texture does not have a MIME
	 * type, a URI is required for correct export.
	 */
	public setURI(uri: string): this {
		this._uri = uri;
		this._mimeType = ImageUtils.extensionToMimeType(FileUtils.extension(uri));
		return this;
	}

	/**********************************************************************************************
	 * Image data.
	 */

	/** Returns the raw image data for this texture. */
	public getImage(): ArrayBuffer | null { return this._image; }

	/** Sets the raw image data for this texture. */
	public setImage(image: ArrayBuffer): this {
		this._image = image;
		return this;
	}

	/** Returns the size, in pixels, of this texture. */
	public getSize(): vec2 | null {
		if (!this._image) return null;
		return ImageUtils.getSize(this._image, this.getMimeType());
	}
}
