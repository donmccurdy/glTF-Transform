import { Nullable, PropertyType, vec3, vec4 } from '../constants';
import { GLTF } from '../types/gltf';
import { ExtensibleProperty, IExtensibleProperty } from './extensible-property';
import { Texture } from './texture';
import { TextureInfo } from './texture-info';
interface IMaterial extends IExtensibleProperty {
    alphaMode: GLTF.MaterialAlphaMode;
    alphaCutoff: number;
    doubleSided: boolean;
    baseColorFactor: vec4;
    baseColorTexture: Texture;
    baseColorTextureInfo: TextureInfo;
    emissiveFactor: vec3;
    emissiveTexture: Texture;
    emissiveTextureInfo: TextureInfo;
    normalScale: number;
    normalTexture: Texture;
    normalTextureInfo: TextureInfo;
    occlusionStrength: number;
    occlusionTexture: Texture;
    occlusionTextureInfo: TextureInfo;
    roughnessFactor: number;
    metallicFactor: number;
    metallicRoughnessTexture: Texture;
    metallicRoughnessTextureInfo: TextureInfo;
}
/**
 * # Material
 *
 * *Materials describe a surface's appearance and response to light.*
 *
 * Each {@link Primitive} within a {@link Mesh} may be assigned a single Material. The number of
 * GPU draw calls typically increases with both the numbers of Primitives and of Materials in an
 * asset; Materials should be reused wherever possible. Techniques like texture atlasing and vertex
 * colors allow objects to have varied appearances while technically sharing a single Material.
 *
 * Material properties are modified by both scalars (like `baseColorFactor`) and textures (like
 * `baseColorTexture`). When both are available, factors are considered linear multipliers against
 * textures of the same name. In the case of base color, vertex colors (`COLOR_0` attributes) are
 * also multiplied.
 *
 * Textures containing color data (`baseColorTexture`, `emissiveTexture`) are sRGB. All other
 * textures are linear. Like other resources, textures should be reused when possible.
 *
 * Usage:
 *
 * ```typescript
 * const material = doc.createMaterial('myMaterial')
 * 	.setBaseColorFactor([1, 0.5, 0.5, 1]) // RGBA
 * 	.setOcclusionTexture(aoTexture)
 * 	.setOcclusionStrength(0.5);
 *
 * mesh.listPrimitives()
 * 	.forEach((prim) => prim.setMaterial(material));
 * ```
 *
 * @category Properties
 */
export declare class Material extends ExtensibleProperty<IMaterial> {
    propertyType: PropertyType.MATERIAL;
    /**********************************************************************************************
     * Constants.
     */
    static AlphaMode: Record<string, GLTF.MaterialAlphaMode>;
    /**********************************************************************************************
     * Instance.
     */
    protected init(): void;
    protected getDefaults(): Nullable<IMaterial>;
    /**********************************************************************************************
     * Double-sided / culling.
     */
    /** Returns true when both sides of triangles should be rendered. May impact performance. */
    getDoubleSided(): boolean;
    /** Sets whether to render both sides of triangles. May impact performance. */
    setDoubleSided(doubleSided: boolean): this;
    /**********************************************************************************************
     * Alpha.
     */
    /** Returns material alpha, equivalent to baseColorFactor[3]. */
    getAlpha(): number;
    /** Sets material alpha, equivalent to baseColorFactor[3]. */
    setAlpha(alpha: number): this;
    /**
     * Returns the mode of the material's alpha channels, which are provided by `baseColorFactor`
     * and `baseColorTexture`.
     *
     * - `OPAQUE`: Alpha value is ignored and the rendered output is fully opaque.
     * - `BLEND`: Alpha value is used to determine the transparency each pixel on a surface, and
     * 	the fraction of surface vs. background color in the final result. Alpha blending creates
     *	significant edge cases in realtime renderers, and some care when structuring the model is
     * 	necessary for good results. In particular, transparent geometry should be kept in separate
     * 	meshes or primitives from opaque geometry. The `depthWrite` or `zWrite` settings in engines
     * 	should usually be disabled on transparent materials.
     * - `MASK`: Alpha value is compared against `alphaCutoff` threshold for each pixel on a
     * 	surface, and the pixel is either fully visible or fully discarded based on that cutoff.
     * 	This technique is useful for things like leafs/foliage, grass, fabric meshes, and other
     * 	surfaces where no semitransparency is needed. With a good choice of `alphaCutoff`, surfaces
     * 	that don't require semitransparency can avoid the performance penalties and visual issues
     * 	involved with `BLEND` transparency.
     *
     * Reference:
     * - [glTF → material.alphaMode](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#materialalphamode)
     */
    getAlphaMode(): GLTF.MaterialAlphaMode;
    /** Sets the mode of the material's alpha channels. See {@link getAlphaMode} for details. */
    setAlphaMode(alphaMode: GLTF.MaterialAlphaMode): this;
    /** Returns the visibility threshold; applied only when `.alphaMode='MASK'`. */
    getAlphaCutoff(): number;
    /** Sets the visibility threshold; applied only when `.alphaMode='MASK'`. */
    setAlphaCutoff(alphaCutoff: number): this;
    /**********************************************************************************************
     * Base color.
     */
    /** Base color / albedo factor in linear space. See {@link getBaseColorTexture}. */
    getBaseColorFactor(): vec4;
    /** Sets the base color / albedo factor in linear space. See {@link getBaseColorTexture}. */
    setBaseColorFactor(baseColorFactor: vec4): this;
    /**
     * Base color / albedo as hexadecimal in sRGB colorspace. Converted automatically from
     * baseColorFactor in linear space. See {@link getBaseColorTexture}.
     */
    getBaseColorHex(): number;
    /**
     * Sets base color / albedo as hexadecimal in sRGB colorspace. Converted automatically to
     * baseColorFactor in linear space. See {@link getBaseColorTexture}.
     */
    setBaseColorHex(hex: number): this;
    /**
     * Base color / albedo. The visible color of a non-metallic surface under constant ambient
     * light would be a linear combination (multiplication) of its vertex colors, base color
     * factor, and base color texture. Lighting, and reflections in metallic or smooth surfaces,
     * also effect the final color. The alpha (`.a`) channel of base color factors and textures
     * will have varying effects, based on the setting of {@link getAlphaMode}.
     *
     * Reference:
     * - [glTF → material.pbrMetallicRoughness.baseColorFactor](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#pbrmetallicroughnessbasecolorfactor)
     */
    getBaseColorTexture(): Texture | null;
    /**
     * Settings affecting the material's use of its base color texture. If no texture is attached,
     * {@link TextureInfo} is `null`.
     */
    getBaseColorTextureInfo(): TextureInfo | null;
    /** Sets base color / albedo texture. See {@link getBaseColorTexture}. */
    setBaseColorTexture(texture: Texture | null): this;
    /**********************************************************************************************
     * Emissive.
     */
    /** Emissive color; linear multiplier. See {@link getEmissiveTexture}. */
    getEmissiveFactor(): vec3;
    /** Sets the emissive color; linear multiplier. See {@link getEmissiveTexture}. */
    setEmissiveFactor(emissiveFactor: vec3): this;
    /**
     * Emissive as hexadecimal in sRGB colorspace. Converted automatically from
     * emissiveFactor in linear space. See {@link getBaseColorTexture}.
     */
    getEmissiveHex(): number;
    /**
     * Sets emissive as hexadecimal in sRGB colorspace. Converted automatically to
     * emissiveFactor in linear space. See {@link getEmissiveTexture}.
     */
    setEmissiveHex(hex: number): this;
    /**
     * Emissive texture. Emissive color is added to any base color of the material, after any
     * lighting/shadowing are applied. An emissive color does not inherently "glow", or affect
     * objects around it at all. To create that effect, most viewers must also enable a
     * post-processing effect called "bloom".
     *
     * Reference:
     * - [glTF → material.emissiveTexture](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#materialemissivetexture)
     */
    getEmissiveTexture(): Texture | null;
    /**
     * Settings affecting the material's use of its emissive texture. If no texture is attached,
     * {@link TextureInfo} is `null`.
     */
    getEmissiveTextureInfo(): TextureInfo | null;
    /** Sets emissive texture. See {@link getEmissiveTexture}. */
    setEmissiveTexture(texture: Texture | null): this;
    /**********************************************************************************************
     * Normal.
     */
    /** Normal (surface detail) factor; linear multiplier. Affects `.normalTexture`. */
    getNormalScale(): number;
    /** Sets normal (surface detail) factor; linear multiplier. Affects `.normalTexture`. */
    setNormalScale(scale: number): this;
    /**
     * Normal (surface detail) texture.
     *
     * A tangent space normal map. The texture contains RGB components in linear space. Each texel
     * represents the XYZ components of a normal vector in tangent space. Red [0 to 255] maps to X
     * [-1 to 1]. Green [0 to 255] maps to Y [-1 to 1]. Blue [128 to 255] maps to Z [1/255 to 1].
     * The normal vectors use OpenGL conventions where +X is right and +Y is up. +Z points toward
     * the viewer.
     *
     * Reference:
     * - [glTF → material.normalTexture](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#materialnormaltexture)
     */
    getNormalTexture(): Texture | null;
    /**
     * Settings affecting the material's use of its normal texture. If no texture is attached,
     * {@link TextureInfo} is `null`.
     */
    getNormalTextureInfo(): TextureInfo | null;
    /** Sets normal (surface detail) texture. See {@link getNormalTexture}. */
    setNormalTexture(texture: Texture | null): this;
    /**********************************************************************************************
     * Occlusion.
     */
    /** (Ambient) Occlusion factor; linear multiplier. Affects `.occlusionTexture`. */
    getOcclusionStrength(): number;
    /** Sets (ambient) occlusion factor; linear multiplier. Affects `.occlusionTexture`. */
    setOcclusionStrength(strength: number): this;
    /**
     * (Ambient) Occlusion texture, generally used for subtle 'baked' shadowing effects that are
     * independent of an object's position, such as shading in inset areas and corners. Direct
     * lighting is not affected by occlusion, so at least one indirect light source must be present
     * in the scene for occlusion effects to be visible.
     *
     * The occlusion values are sampled from the R channel. Higher values indicate areas that
     * should receive full indirect lighting and lower values indicate no indirect lighting.
     *
     * Reference:
     * - [glTF → material.occlusionTexture](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#materialocclusiontexture)
     */
    getOcclusionTexture(): Texture | null;
    /**
     * Settings affecting the material's use of its occlusion texture. If no texture is attached,
     * {@link TextureInfo} is `null`.
     */
    getOcclusionTextureInfo(): TextureInfo | null;
    /** Sets (ambient) occlusion texture. See {@link getOcclusionTexture}. */
    setOcclusionTexture(texture: Texture | null): this;
    /**********************************************************************************************
     * Metallic / roughness.
     */
    /**
     * Roughness factor; linear multiplier. Affects roughness channel of
     * `metallicRoughnessTexture`. See {@link getMetallicRoughnessTexture}.
     */
    getRoughnessFactor(): number;
    /**
     * Sets roughness factor; linear multiplier. Affects roughness channel of
     * `metallicRoughnessTexture`. See {@link getMetallicRoughnessTexture}.
     */
    setRoughnessFactor(factor: number): this;
    /**
     * Metallic factor; linear multiplier. Affects roughness channel of
     * `metallicRoughnessTexture`. See {@link getMetallicRoughnessTexture}.
     */
    getMetallicFactor(): number;
    /**
     * Sets metallic factor; linear multiplier. Affects roughness channel of
     * `metallicRoughnessTexture`. See {@link getMetallicRoughnessTexture}.
     */
    setMetallicFactor(factor: number): this;
    /**
     * Metallic roughness texture. The metalness values are sampled from the B channel. The
     * roughness values are sampled from the G channel. When a material is fully metallic,
     * or nearly so, it may require image-based lighting (i.e. an environment map) or global
     * illumination to appear well-lit.
     *
     * Reference:
     * - [glTF → material.pbrMetallicRoughness.metallicRoughnessTexture](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#pbrmetallicroughnessmetallicroughnesstexture)
     */
    getMetallicRoughnessTexture(): Texture | null;
    /**
     * Settings affecting the material's use of its metallic/roughness texture. If no texture is
     * attached, {@link TextureInfo} is `null`.
     */
    getMetallicRoughnessTextureInfo(): TextureInfo | null;
    /** Sets metallic/roughness texture. See {@link getMetallicRoughnessTexture}. */
    setMetallicRoughnessTexture(texture: Texture | null): this;
}
export {};
