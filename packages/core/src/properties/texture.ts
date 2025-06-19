import { type Nullable, PropertyType, type vec2 } from '../constants.js';
import { BufferUtils, FileUtils, ImageUtils } from '../utils/index.js';
import { ExtensibleProperty, type IExtensibleProperty } from './extensible-property.js';

interface ITexture extends IExtensibleProperty {
	image: Uint8Array | null;
	mimeType: string;
	uri: string;
}

/**
 * *Texture, or images, referenced by {@link Material} properties.*
 *
 * Textures in glTF Transform are a combination of glTF's `texture` and `image` properties, and
 * should be unique within a document, such that no other texture contains the same
 * {@link Texture.getImage getImage()} data. Where duplicates may already exist, the `dedup({textures: true})`
 * transform can remove them. A {@link Document} with N texture properties will be exported to a
 * glTF file with N `image` properties, and the minimum number of `texture` properties necessary
 * for the materials that use it.
 *
 * For properties associated with a particular _use_ of a texture, see {@link TextureInfo}.
 *
 * Reference:
 * - [glTF → Textures](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#textures)
 * - [glTF → Images](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#images)
 *
 * @category Properties
 */
export class Texture extends ExtensibleProperty<ITexture> {
	public declare propertyType: PropertyType.TEXTURE;

	protected init(): void {
		this.propertyType = PropertyType.TEXTURE;
	}

	protected getDefaults(): Nullable<ITexture> {
		return Object.assign(super.getDefaults() as IExtensibleProperty, { image: null, mimeType: '', uri: '' });
	}

	/**********************************************************************************************
	 * MIME type / format.
	 */

	/** Returns the MIME type for this texture ('image/jpeg' or 'image/png'). */
	public getMimeType(): string {
		return this.get('mimeType') || ImageUtils.extensionToMimeType(FileUtils.extension(this.get('uri')));
	}

	/**
	 * Sets the MIME type for this texture ('image/jpeg' or 'image/png'). If the texture does not
	 * have a URI, a MIME type is required for correct export.
	 */
	public setMimeType(mimeType: string): this {
		return this.set('mimeType', mimeType);
	}

	/**********************************************************************************************
	 * URI / filename.
	 */

	/** Returns the URI (e.g. 'path/to/file.png') for this texture. */
	public getURI(): string {
		return this.get('uri');
	}

	/**
	 * Sets the URI (e.g. 'path/to/file.png') for this texture. If the texture does not have a MIME
	 * type, a URI is required for correct export.
	 */
	public setURI(uri: string): this {
		this.set('uri', uri);
		const mimeType = ImageUtils.extensionToMimeType(FileUtils.extension(uri));
		if (mimeType) this.set('mimeType', mimeType);
		return this;
	}

	/**********************************************************************************************
	 * Image data.
	 */

	/** Returns the raw image data for this texture. */
	public getImage(): Uint8Array | null {
		return this.get('image');
	}

	/** Sets the raw image data for this texture. */
	public setImage(image: Uint8Array): this {
		return this.set('image', BufferUtils.assertView(image));
	}

	/** Returns the size, in pixels, of this texture. */
	public getSize(): vec2 | null {
		const image = this.get('image');
		if (!image) return null;
		return ImageUtils.getSize(image, this.getMimeType());
	}
}
