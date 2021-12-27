import { ExtensionProperty, IProperty, Nullable, PropertyType, Texture, TextureInfo, vec3 } from '@gltf-transform/core';
import { KHR_MATERIALS_SHEEN } from '../constants';
interface ISheen extends IProperty {
    sheenColorFactor: vec3;
    sheenColorTexture: Texture;
    sheenColorTextureInfo: TextureInfo;
    sheenRoughnessFactor: number;
    sheenRoughnessTexture: Texture;
    sheenRoughnessTextureInfo: TextureInfo;
}
/**
 * # Sheen
 *
 * Defines sheen on a PBR {@link Material}. See {@link MaterialsSheen}.
 */
export declare class Sheen extends ExtensionProperty<ISheen> {
    static EXTENSION_NAME: string;
    extensionName: typeof KHR_MATERIALS_SHEEN;
    propertyType: 'Sheen';
    parentTypes: [PropertyType.MATERIAL];
    protected init(): void;
    protected getDefaults(): Nullable<ISheen>;
    /**********************************************************************************************
     * Sheen color.
     */
    /** Sheen; linear multiplier. */
    getSheenColorFactor(): vec3;
    /** Sheen; hex color in sRGB colorspace. */
    getSheenColorHex(): number;
    /** Sheen; linear multiplier. */
    setSheenColorFactor(factor: vec3): this;
    /** Sheen; hex color in sRGB colorspace. */
    setSheenColorHex(hex: number): this;
    /**
     * Sheen color texture, in sRGB colorspace.
     */
    getSheenColorTexture(): Texture | null;
    /**
     * Settings affecting the material's use of its sheen color texture. If no texture is attached,
     * {@link TextureInfo} is `null`.
     */
    getSheenColorTextureInfo(): TextureInfo | null;
    /** Sets sheen color texture. See {@link getSheenColorTexture}. */
    setSheenColorTexture(texture: Texture | null): this;
    /**********************************************************************************************
     * Sheen roughness.
     */
    /** Sheen roughness; linear multiplier. See {@link getSheenRoughnessTexture}. */
    getSheenRoughnessFactor(): number;
    /** Sheen roughness; linear multiplier. See {@link getSheenRoughnessTexture}. */
    setSheenRoughnessFactor(factor: number): this;
    /**
     * Sheen roughness texture; linear multiplier. The `a` channel of this texture specifies
     * roughness, independent of the base layer's roughness.
     */
    getSheenRoughnessTexture(): Texture | null;
    /**
     * Settings affecting the material's use of its sheen roughness texture. If no texture is
     * attached, {@link TextureInfo} is `null`.
     */
    getSheenRoughnessTextureInfo(): TextureInfo | null;
    /**
     * Sets sheen roughness texture.  The `a` channel of this texture specifies
     * roughness, independent of the base layer's roughness.
     */
    setSheenRoughnessTexture(texture: Texture | null): this;
}
export {};
