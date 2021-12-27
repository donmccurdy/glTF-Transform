import { Nullable, PropertyType } from '../constants';
import { GLTF } from '../types/gltf';
import { ExtensibleProperty, IExtensibleProperty } from './extensible-property';
interface ITextureInfo extends IExtensibleProperty {
    texCoord: number;
    magFilter: GLTF.TextureMagFilter | null;
    minFilter: GLTF.TextureMinFilter | null;
    wrapS: GLTF.TextureWrapMode;
    wrapT: GLTF.TextureWrapMode;
}
/**
 * # TextureInfo
 *
 * *Settings associated with a particular use of a {@link Texture}.*
 *
 * Different materials may reuse the same texture but with different texture coordinates,
 * minFilter/magFilter, or wrapS/wrapT settings. The TextureInfo class contains settings
 * derived from both the "TextureInfo" and "Sampler" properties in the glTF specification,
 * consolidated here for simplicity.
 *
 * TextureInfo properties cannot be directly created. For any material texture slot, such as
 * baseColorTexture, there will be a corresponding method to obtain the TextureInfo for that slot.
 * For example, see {@link Material.getBaseColorTextureInfo}.
 *
 * References:
 * - [glTF → Texture Info](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#reference-textureinfo)
 *
 * @category Properties
 */
export declare class TextureInfo extends ExtensibleProperty<ITextureInfo> {
    propertyType: PropertyType.TEXTURE_INFO;
    /**********************************************************************************************
     * Constants.
     */
    /** UV wrapping mode. Values correspond to WebGL enums. */
    static WrapMode: Record<string, GLTF.TextureWrapMode>;
    /** Magnification filter. Values correspond to WebGL enums. */
    static MagFilter: Record<string, GLTF.TextureMagFilter>;
    /** Minification filter. Values correspond to WebGL enums. */
    static MinFilter: Record<string, GLTF.TextureMinFilter>;
    /**********************************************************************************************
     * Instance.
     */
    protected init(): void;
    protected getDefaults(): Nullable<ITextureInfo>;
    /**********************************************************************************************
     * Texture coordinates.
     */
    /** Returns the texture coordinate (UV set) index for the texture. */
    getTexCoord(): number;
    /** Sets the texture coordinate (UV set) index for the texture. */
    setTexCoord(texCoord: number): this;
    /**********************************************************************************************
     * Min/mag filter.
     */
    /** Returns the magnification filter applied to the texture. */
    getMagFilter(): GLTF.TextureMagFilter | null;
    /** Sets the magnification filter applied to the texture. */
    setMagFilter(magFilter: GLTF.TextureMagFilter | null): this;
    /** Sets the minification filter applied to the texture. */
    getMinFilter(): GLTF.TextureMinFilter | null;
    /** Returns the minification filter applied to the texture. */
    setMinFilter(minFilter: GLTF.TextureMinFilter | null): this;
    /**********************************************************************************************
     * UV wrapping.
     */
    /** Returns the S (U) wrapping mode for UVs used by the texture. */
    getWrapS(): GLTF.TextureWrapMode;
    /** Sets the S (U) wrapping mode for UVs used by the texture. */
    setWrapS(wrapS: GLTF.TextureWrapMode): this;
    /** Returns the T (V) wrapping mode for UVs used by the texture. */
    getWrapT(): GLTF.TextureWrapMode;
    /** Sets the T (V) wrapping mode for UVs used by the texture. */
    setWrapT(wrapT: GLTF.TextureWrapMode): this;
}
export {};
