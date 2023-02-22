import { Nullable, PropertyType, TextureChannel, vec3, vec4 } from '../constants.js';
import type { GLTF } from '../types/gltf.js';
import { ColorUtils } from '../utils/index.js';
import { ExtensibleProperty, IExtensibleProperty } from './extensible-property.js';
import type { Texture } from './texture.js';
import { TextureInfo } from './texture-info.js';

const { R, G, B, A } = TextureChannel;

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
export class Material extends ExtensibleProperty<IMaterial> {
	public declare propertyType: PropertyType.MATERIAL;

	/**********************************************************************************************
	 * Constants.
	 */

	public static AlphaMode: Record<string, GLTF.MaterialAlphaMode> = {
		/**
		 * The alpha value is ignored and the rendered output is fully opaque
		 */
		OPAQUE: 'OPAQUE',
		/**
		 * The rendered output is either fully opaque or fully transparent depending on the alpha
		 * value and the specified alpha cutoff value
		 */
		MASK: 'MASK',
		/**
		 * The alpha value is used to composite the source and destination areas. The rendered
		 * output is combined with the background using the normal painting operation (i.e. the
		 * Porter and Duff over operator)
		 */
		BLEND: 'BLEND',
	};

	/**********************************************************************************************
	 * Instance.
	 */

	protected init(): void {
		this.propertyType = PropertyType.MATERIAL;
	}

	protected getDefaults(): Nullable<IMaterial> {
		return Object.assign(super.getDefaults() as IExtensibleProperty, {
			alphaMode: Material.AlphaMode.OPAQUE,
			alphaCutoff: 0.5,
			doubleSided: false,
			baseColorFactor: [1, 1, 1, 1] as vec4,
			baseColorTexture: null,
			baseColorTextureInfo: new TextureInfo(this.graph, 'baseColorTextureInfo'),
			emissiveFactor: [0, 0, 0] as vec3,
			emissiveTexture: null,
			emissiveTextureInfo: new TextureInfo(this.graph, 'emissiveTextureInfo'),
			normalScale: 1,
			normalTexture: null,
			normalTextureInfo: new TextureInfo(this.graph, 'normalTextureInfo'),
			occlusionStrength: 1,
			occlusionTexture: null,
			occlusionTextureInfo: new TextureInfo(this.graph, 'occlusionTextureInfo'),
			roughnessFactor: 1,
			metallicFactor: 1,
			metallicRoughnessTexture: null,
			metallicRoughnessTextureInfo: new TextureInfo(this.graph, 'metallicRoughnessTextureInfo'),
		});
	}

	/**********************************************************************************************
	 * Double-sided / culling.
	 */

	/** Returns true when both sides of triangles should be rendered. May impact performance. */
	public getDoubleSided(): boolean {
		return this.get('doubleSided');
	}

	/** Sets whether to render both sides of triangles. May impact performance. */
	public setDoubleSided(doubleSided: boolean): this {
		return this.set('doubleSided', doubleSided);
	}

	/**********************************************************************************************
	 * Alpha.
	 */

	/** Returns material alpha, equivalent to baseColorFactor[3]. */
	public getAlpha(): number {
		return this.get('baseColorFactor')[3];
	}

	/** Sets material alpha, equivalent to baseColorFactor[3]. */
	public setAlpha(alpha: number): this {
		const baseColorFactor = this.get('baseColorFactor').slice() as vec4;
		baseColorFactor[3] = alpha;
		return this.set('baseColorFactor', baseColorFactor);
	}

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
	 * - [glTF → material.alphaMode](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#materialalphamode)
	 */
	public getAlphaMode(): GLTF.MaterialAlphaMode {
		return this.get('alphaMode');
	}

	/** Sets the mode of the material's alpha channels. See {@link getAlphaMode} for details. */
	public setAlphaMode(alphaMode: GLTF.MaterialAlphaMode): this {
		return this.set('alphaMode', alphaMode);
	}

	/** Returns the visibility threshold; applied only when `.alphaMode='MASK'`. */
	public getAlphaCutoff(): number {
		return this.get('alphaCutoff');
	}

	/** Sets the visibility threshold; applied only when `.alphaMode='MASK'`. */
	public setAlphaCutoff(alphaCutoff: number): this {
		return this.set('alphaCutoff', alphaCutoff);
	}

	/**********************************************************************************************
	 * Base color.
	 */

	/** Base color / albedo factor; Linear-sRGB components. See {@link getBaseColorTexture}. */
	public getBaseColorFactor(): vec4 {
		return this.get('baseColorFactor');
	}

	/** Base color / albedo factor; Linear-sRGB components. See {@link getBaseColorTexture}. */
	public setBaseColorFactor(baseColorFactor: vec4): this {
		return this.set('baseColorFactor', baseColorFactor);
	}

	/**
	 * Base color / albedo; sRGB hexadecimal color. See {@link getBaseColorTexture}.
	 */
	public getBaseColorHex(): number {
		return ColorUtils.factorToHex(this.get('baseColorFactor'));
	}

	/**
	 * Base color / albedo; sRGB hexadecimal color. See {@link getBaseColorTexture}.
	 */
	public setBaseColorHex(hex: number): this {
		const factor = this.get('baseColorFactor').slice() as vec4;
		return this.set('baseColorFactor', ColorUtils.hexToFactor(hex, factor));
	}

	/**
	 * Base color / albedo. The visible color of a non-metallic surface under constant ambient
	 * light would be a linear combination (multiplication) of its vertex colors, base color
	 * factor, and base color texture. Lighting, and reflections in metallic or smooth surfaces,
	 * also effect the final color. The alpha (`.a`) channel of base color factors and textures
	 * will have varying effects, based on the setting of {@link getAlphaMode}.
	 *
	 * Reference:
	 * - [glTF → material.pbrMetallicRoughness.baseColorFactor](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#pbrmetallicroughnessbasecolorfactor)
	 */
	public getBaseColorTexture(): Texture | null {
		return this.getRef('baseColorTexture');
	}

	/**
	 * Settings affecting the material's use of its base color texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getBaseColorTextureInfo(): TextureInfo | null {
		return this.getRef('baseColorTexture') ? this.getRef('baseColorTextureInfo') : null;
	}

	/** Sets base color / albedo texture. See {@link getBaseColorTexture}. */
	public setBaseColorTexture(texture: Texture | null): this {
		return this.setRef('baseColorTexture', texture, { channels: R | G | B | A });
	}

	/**********************************************************************************************
	 * Emissive.
	 */

	/** Emissive color; Linear-sRGB components. See {@link getEmissiveTexture}. */
	public getEmissiveFactor(): vec3 {
		return this.get('emissiveFactor');
	}

	/** Emissive color; Linear-sRGB components. See {@link getEmissiveTexture}. */
	public setEmissiveFactor(emissiveFactor: vec3): this {
		return this.set('emissiveFactor', emissiveFactor);
	}

	/** Emissive; sRGB hexadecimal color. See {@link getBaseColorTexture}. */
	public getEmissiveHex(): number {
		return ColorUtils.factorToHex(this.get('emissiveFactor'));
	}

	/** Emissive; sRGB hexadecimal color. See {@link getEmissiveTexture}. */
	public setEmissiveHex(hex: number): this {
		const factor = this.get('emissiveFactor').slice() as vec3;
		return this.set('emissiveFactor', ColorUtils.hexToFactor(hex, factor));
	}

	/**
	 * Emissive texture. Emissive color is added to any base color of the material, after any
	 * lighting/shadowing are applied. An emissive color does not inherently "glow", or affect
	 * objects around it at all. To create that effect, most viewers must also enable a
	 * post-processing effect called "bloom".
	 *
	 * Reference:
	 * - [glTF → material.emissiveTexture](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#materialemissivetexture)
	 */
	public getEmissiveTexture(): Texture | null {
		return this.getRef('emissiveTexture');
	}

	/**
	 * Settings affecting the material's use of its emissive texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getEmissiveTextureInfo(): TextureInfo | null {
		return this.getRef('emissiveTexture') ? this.getRef('emissiveTextureInfo') : null;
	}

	/** Sets emissive texture. See {@link getEmissiveTexture}. */
	public setEmissiveTexture(texture: Texture | null): this {
		return this.setRef('emissiveTexture', texture, { channels: R | G | B });
	}

	/**********************************************************************************************
	 * Normal.
	 */

	/** Normal (surface detail) factor; linear multiplier. Affects `.normalTexture`. */
	public getNormalScale(): number {
		return this.get('normalScale');
	}

	/** Normal (surface detail) factor; linear multiplier. Affects `.normalTexture`. */
	public setNormalScale(scale: number): this {
		return this.set('normalScale', scale);
	}

	/**
	 * Normal (surface detail) texture.
	 *
	 * A tangent space normal map. The texture contains RGB components. Each texel represents the
	 * XYZ components of a normal vector in tangent space. Red [0 to 255] maps to X [-1 to 1].
	 * Green [0 to 255] maps to Y [-1 to 1]. Blue [128 to 255] maps to Z [1/255 to 1]. The normal
	 * vectors use OpenGL conventions where +X is right and +Y is up. +Z points toward the viewer.
	 *
	 * Reference:
	 * - [glTF → material.normalTexture](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#materialnormaltexture)
	 */
	public getNormalTexture(): Texture | null {
		return this.getRef('normalTexture');
	}

	/**
	 * Settings affecting the material's use of its normal texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getNormalTextureInfo(): TextureInfo | null {
		return this.getRef('normalTexture') ? this.getRef('normalTextureInfo') : null;
	}

	/** Sets normal (surface detail) texture. See {@link getNormalTexture}. */
	public setNormalTexture(texture: Texture | null): this {
		return this.setRef('normalTexture', texture, { channels: R | G | B });
	}

	/**********************************************************************************************
	 * Occlusion.
	 */

	/** (Ambient) Occlusion factor; linear multiplier. Affects `.occlusionTexture`. */
	public getOcclusionStrength(): number {
		return this.get('occlusionStrength');
	}

	/** Sets (ambient) occlusion factor; linear multiplier. Affects `.occlusionTexture`. */
	public setOcclusionStrength(strength: number): this {
		return this.set('occlusionStrength', strength);
	}

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
	 * - [glTF → material.occlusionTexture](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#materialocclusiontexture)
	 */
	public getOcclusionTexture(): Texture | null {
		return this.getRef('occlusionTexture');
	}

	/**
	 * Settings affecting the material's use of its occlusion texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getOcclusionTextureInfo(): TextureInfo | null {
		return this.getRef('occlusionTexture') ? this.getRef('occlusionTextureInfo') : null;
	}

	/** Sets (ambient) occlusion texture. See {@link getOcclusionTexture}. */
	public setOcclusionTexture(texture: Texture | null): this {
		return this.setRef('occlusionTexture', texture, { channels: R });
	}

	/**********************************************************************************************
	 * Metallic / roughness.
	 */

	/**
	 * Roughness factor; linear multiplier. Affects roughness channel of
	 * `metallicRoughnessTexture`. See {@link getMetallicRoughnessTexture}.
	 */
	public getRoughnessFactor(): number {
		return this.get('roughnessFactor');
	}

	/**
	 * Sets roughness factor; linear multiplier. Affects roughness channel of
	 * `metallicRoughnessTexture`. See {@link getMetallicRoughnessTexture}.
	 */
	public setRoughnessFactor(factor: number): this {
		return this.set('roughnessFactor', factor);
	}

	/**
	 * Metallic factor; linear multiplier. Affects roughness channel of
	 * `metallicRoughnessTexture`. See {@link getMetallicRoughnessTexture}.
	 */
	public getMetallicFactor(): number {
		return this.get('metallicFactor');
	}

	/**
	 * Sets metallic factor; linear multiplier. Affects roughness channel of
	 * `metallicRoughnessTexture`. See {@link getMetallicRoughnessTexture}.
	 */
	public setMetallicFactor(factor: number): this {
		return this.set('metallicFactor', factor);
	}

	/**
	 * Metallic roughness texture. The metalness values are sampled from the B channel. The
	 * roughness values are sampled from the G channel. When a material is fully metallic,
	 * or nearly so, it may require image-based lighting (i.e. an environment map) or global
	 * illumination to appear well-lit.
	 *
	 * Reference:
	 * - [glTF → material.pbrMetallicRoughness.metallicRoughnessTexture](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#pbrmetallicroughnessmetallicroughnesstexture)
	 */
	public getMetallicRoughnessTexture(): Texture | null {
		return this.getRef('metallicRoughnessTexture');
	}

	/**
	 * Settings affecting the material's use of its metallic/roughness texture. If no texture is
	 * attached, {@link TextureInfo} is `null`.
	 */
	public getMetallicRoughnessTextureInfo(): TextureInfo | null {
		return this.getRef('metallicRoughnessTexture') ? this.getRef('metallicRoughnessTextureInfo') : null;
	}

	/** Sets metallic/roughness texture. See {@link getMetallicRoughnessTexture}. */
	public setMetallicRoughnessTexture(texture: Texture | null): this {
		return this.setRef('metallicRoughnessTexture', texture, { channels: G | B });
	}
}
