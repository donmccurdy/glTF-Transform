import { ExtensionProperty, IProperty, Nullable, PropertyType, Texture, TextureInfo, vec3, vec4 } from '@gltf-transform/core';
import { KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS } from '../constants';
interface IPBRSpecularGlossiness extends IProperty {
    diffuseFactor: vec4;
    diffuseTexture: Texture;
    diffuseTextureInfo: TextureInfo;
    specularFactor: vec3;
    glossinessFactor: number;
    specularGlossinessTexture: Texture;
    specularGlossinessTextureInfo: TextureInfo;
}
/**
 * # PBRSpecularGlossiness
 *
 * Converts a {@link Material} to a spec/gloss workflow. See {@link MaterialsPBRSpecularGlossiness}.
 */
export declare class PBRSpecularGlossiness extends ExtensionProperty<IPBRSpecularGlossiness> {
    static EXTENSION_NAME: string;
    extensionName: typeof KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS;
    propertyType: 'PBRSpecularGlossiness';
    parentTypes: [PropertyType.MATERIAL];
    protected init(): void;
    protected getDefaults(): Nullable<IPBRSpecularGlossiness>;
    /**********************************************************************************************
     * Diffuse.
     */
    /** Diffuse; linear multiplier. See {@link getDiffuseTexture}. */
    getDiffuseFactor(): vec4;
    /** Diffuse; linear multiplier. See {@link getDiffuseTexture}. */
    setDiffuseFactor(factor: vec4): this;
    /** Diffuse; hex color in sRGB colorspace. */
    getDiffuseHex(): number;
    /** Diffuse; hex color in sRGB colorspace. */
    setDiffuseHex(hex: number): this;
    /**
     * Diffuse texture; linear multiplier. Alternative to baseColorTexture used within the
     * spec/gloss PBR workflow.
     */
    getDiffuseTexture(): Texture | null;
    /**
     * Settings affecting the material's use of its diffuse texture. If no texture is attached,
     * {@link TextureInfo} is `null`.
     */
    getDiffuseTextureInfo(): TextureInfo | null;
    /** Sets diffuse texture. See {@link getDiffuseTexture}. */
    setDiffuseTexture(texture: Texture | null): this;
    /**********************************************************************************************
     * Specular.
     */
    /** Specular; linear multiplier. */
    getSpecularFactor(): vec3;
    /** Specular; linear multiplier. */
    setSpecularFactor(factor: vec3): this;
    /**********************************************************************************************
     * Glossiness.
     */
    /** Glossiness; linear multiplier. */
    getGlossinessFactor(): number;
    /** Glossiness; linear multiplier. */
    setGlossinessFactor(factor: number): this;
    /**********************************************************************************************
     * Specular/Glossiness.
     */
    /** Spec/gloss texture; linear multiplier. */
    getSpecularGlossinessTexture(): Texture | null;
    /**
     * Settings affecting the material's use of its spec/gloss texture. If no texture is attached,
     * {@link TextureInfo} is `null`.
     */
    getSpecularGlossinessTextureInfo(): TextureInfo | null;
    /** Spec/gloss texture; linear multiplier. */
    setSpecularGlossinessTexture(texture: Texture | null): this;
}
export {};
