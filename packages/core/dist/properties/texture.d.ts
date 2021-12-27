import { Nullable, PropertyType, vec2 } from '../constants';
import { ExtensibleProperty, IExtensibleProperty } from './extensible-property';
interface ITexture extends IExtensibleProperty {
    image: Uint8Array | null;
    mimeType: string;
    uri: string;
}
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
export declare class Texture extends ExtensibleProperty<ITexture> {
    propertyType: PropertyType.TEXTURE;
    protected init(): void;
    protected getDefaults(): Nullable<ITexture>;
    /**********************************************************************************************
     * MIME type / format.
     */
    /** Returns the MIME type for this texture ('image/jpeg' or 'image/png'). */
    getMimeType(): string;
    /**
     * Sets the MIME type for this texture ('image/jpeg' or 'image/png'). If the texture does not
     * have a URI, a MIME type is required for correct export.
     */
    setMimeType(mimeType: string): this;
    /**********************************************************************************************
     * URI / filename.
     */
    /** Returns the URI (e.g. 'path/to/file.png') for this texture. */
    getURI(): string;
    /**
     * Sets the URI (e.g. 'path/to/file.png') for this texture. If the texture does not have a MIME
     * type, a URI is required for correct export.
     */
    setURI(uri: string): this;
    /**********************************************************************************************
     * Image data.
     */
    /** Returns the raw image data for this texture. */
    getImage(): Uint8Array | null;
    /** Sets the raw image data for this texture. */
    setImage(image: Uint8Array): this;
    /** Returns the size, in pixels, of this texture. */
    getSize(): vec2 | null;
}
export {};
