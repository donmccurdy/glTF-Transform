import { ExtensionProperty, IProperty, Nullable, PropertyType, Texture, TextureInfo, vec3 } from '@gltf-transform/core';
import { KHR_MATERIALS_SPECULAR } from '../constants';
interface ISpecular extends IProperty {
    specularFactor: number;
    specularTexture: Texture;
    specularTextureInfo: TextureInfo;
    specularColorFactor: vec3;
    specularColorTexture: Texture;
    specularColorTextureInfo: TextureInfo;
}
/**
 * # Specular
 *
 * Defines specular reflectivity on a PBR {@link Material}. See {@link MaterialsSpecular}.
 */
export declare class Specular extends ExtensionProperty<ISpecular> {
    static EXTENSION_NAME: string;
    extensionName: typeof KHR_MATERIALS_SPECULAR;
    propertyType: 'Specular';
    parentTypes: [PropertyType.MATERIAL];
    protected init(): void;
    protected getDefaults(): Nullable<ISpecular>;
    /**********************************************************************************************
     * Specular.
     */
    /** Specular; linear multiplier. See {@link getSpecularTexture}. */
    getSpecularFactor(): number;
    /** Specular; linear multiplier. See {@link getSpecularTexture}. */
    setSpecularFactor(factor: number): this;
    /** Specular color; components in linear space. See {@link getSpecularTexture}. */
    getSpecularColorFactor(): vec3;
    /** Specular color; components in linear space. See {@link getSpecularTexture}. */
    setSpecularColorFactor(factor: vec3): this;
    /** Specular color; hexadecimal in sRGB colorspace. See {@link getSpecularTexture} */
    getSpecularColorHex(): number;
    /** Specular color; hexadecimal in sRGB colorspace. See {@link getSpecularTexture} */
    setSpecularColorHex(hex: number): this;
    /**
     * Specular texture; linear multiplier. Configures the strength of the specular reflection in
     * the dielectric BRDF. A value of zero disables the specular reflection, resulting in a pure
     * diffuse material.
     *
     * Only the alpha (A) channel is used for specular strength, but this texture may optionally
     * be packed with specular color (RGB) into a single texture.
     */
    getSpecularTexture(): Texture | null;
    /**
     * Settings affecting the material's use of its specular texture. If no texture is attached,
     * {@link TextureInfo} is `null`.
     */
    getSpecularTextureInfo(): TextureInfo | null;
    /** Sets specular texture. See {@link getSpecularTexture}. */
    setSpecularTexture(texture: Texture | null): this;
    /**
     * Specular color texture; linear multiplier. Defines the F0 color of the specular reflection
     * (RGB channels, encoded in sRGB) in the the dielectric BRDF.
     *
     * Only RGB channels are used here, but this texture may optionally be packed with a specular
     * factor (A) into a single texture.
     */
    getSpecularColorTexture(): Texture | null;
    /**
     * Settings affecting the material's use of its specular color texture. If no texture is
     * attached, {@link TextureInfo} is `null`.
     */
    getSpecularColorTextureInfo(): TextureInfo | null;
    /** Sets specular color texture. See {@link getSpecularColorTexture}. */
    setSpecularColorTexture(texture: Texture | null): this;
}
export {};
