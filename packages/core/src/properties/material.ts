import { PropertyType, TextureChannel, vec3, vec4 } from '../constants';
import { GraphChild, Link } from '../graph/index';
import { GLTF } from '../types/gltf';
import { ColorUtils } from '../utils';
import { ExtensibleProperty } from './extensible-property';
import { COPY_IDENTITY } from './property';
import { TextureLink } from './property-links';
import { Texture } from './texture';
import { TextureInfo } from './texture-info';

const { R, G, B, A } = TextureChannel;

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
export class Material extends ExtensibleProperty {
	public readonly propertyType = PropertyType.MATERIAL;

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
	}

	/**********************************************************************************************
	 * Instance.
	 */

	/** @internal Mode of the material's alpha channels. (`OPAQUE`, `BLEND`, or `MASK`) */
	private _alphaMode: GLTF.MaterialAlphaMode = Material.AlphaMode.OPAQUE;

	/** @internal Visibility threshold. Applied only when `.alphaMode='MASK'`. */
	private _alphaCutoff = 0.5;

	/** @internal When true, both sides of each triangle are rendered. May decrease performance. */
	private _doubleSided = false;

	/** @internal Base color / albedo; linear multiplier. */
	private _baseColorFactor: vec4 = [1, 1, 1, 1];

	/** @internal Emissive color; linear multiplier. */
	private _emissiveFactor: vec3 = [0, 0, 0];

	/** @internal Normal (surface detail) factor; linear multiplier. Affects `.normalTexture`. */
	private _normalScale = 1;

	/** @internal (Ambient) Occlusion factor; linear multiplier. Affects `.occlusionMap`. */
	private _occlusionStrength = 1;

	/**
	 * Roughness factor; linear multiplier. Affects roughness channel of
	 * `metallicRoughnessTexture`.
	 * @internal
	 */
	private _roughnessFactor = 1;

	/**
	 * Metallic factor; linear multiplier. Affects metallic channel of
	 * `metallicRoughnessTexture`.
	 * @internal
	 */
	private _metallicFactor = 1;

	/** @internal Base color / albedo texture. */
	@GraphChild private baseColorTexture: TextureLink | null = null;
	@GraphChild private baseColorTextureInfo: Link<this, TextureInfo> =
		this.graph.link('baseColorTextureInfo', this, new TextureInfo(this.graph));

	/** @internal Emissive texture. */
	@GraphChild private emissiveTexture: TextureLink | null = null;
	@GraphChild private emissiveTextureInfo: Link<this, TextureInfo> =
		this.graph.link('emissiveTextureInfo', this, new TextureInfo(this.graph));

	/**
	 * Normal (surface detail) texture. Normal maps often suffer artifacts with JPEG compression,
	 * so PNG files are preferred.
	 * @internal
	 */
	@GraphChild private normalTexture: TextureLink | null = null;
	@GraphChild private normalTextureInfo: Link<this, TextureInfo> =
		this.graph.link('normalTextureInfo', this, new TextureInfo(this.graph));

	/**
	 * (Ambient) Occlusion texture. Occlusion data is stored in the `.r` channel, allowing this
	 * texture to be packed with `metallicRoughnessTexture`, optionally.
	 * @internal
	 */
	@GraphChild private occlusionTexture: TextureLink | null = null;
	@GraphChild private occlusionTextureInfo: Link<this, TextureInfo> =
		this.graph.link('occlusionTextureInfo', this, new TextureInfo(this.graph));

	/**
	 * Metallic/roughness PBR texture. Roughness data is stored in the `.g` channel and metallic
	 * data is stored in the `.b` channel, allowing thist exture to be packed with
	 * `occlusionTexture`, optionally.
	 * @internal
	*/
	@GraphChild private metallicRoughnessTexture: TextureLink | null = null;
	@GraphChild private metallicRoughnessTextureInfo: Link<this, TextureInfo> =
		this.graph.link('metallicRoughnessTextureInfo', this, new TextureInfo(this.graph));

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this._alphaMode = other._alphaMode;
		this._alphaCutoff = other._alphaCutoff;
		this._doubleSided = other._doubleSided;
		this._baseColorFactor = [...other._baseColorFactor] as vec4;
		this._emissiveFactor = [...other._emissiveFactor] as vec3;
		this._normalScale = other._normalScale;
		this._occlusionStrength = other._occlusionStrength;
		this._roughnessFactor = other._roughnessFactor;
		this._metallicFactor = other._metallicFactor;

		this.setBaseColorTexture(
			other.baseColorTexture ? resolve(other.baseColorTexture.getChild()) : null
		);
		this.baseColorTextureInfo.getChild()
			.copy(resolve(other.baseColorTextureInfo.getChild()), resolve);

		this.setEmissiveTexture(
			other.emissiveTexture ? resolve(other.emissiveTexture.getChild()) : null
		);
		this.emissiveTextureInfo.getChild()
			.copy(resolve(other.emissiveTextureInfo.getChild()), resolve);

		this.setNormalTexture(
			other.normalTexture ? resolve(other.normalTexture.getChild()) : null
		);
		this.normalTextureInfo.getChild()
			.copy(resolve(other.normalTextureInfo.getChild()), resolve);

		this.setOcclusionTexture(
			other.occlusionTexture ? resolve(other.occlusionTexture.getChild()) : null
		);
		this.occlusionTextureInfo.getChild()
			.copy(resolve(other.occlusionTextureInfo.getChild()), resolve);

		this.setMetallicRoughnessTexture(
			other.metallicRoughnessTexture
				? resolve(other.metallicRoughnessTexture.getChild())
				: null
		);
		this.metallicRoughnessTextureInfo.getChild()
			.copy(resolve(other.metallicRoughnessTextureInfo.getChild()), resolve);

		return this;
	}

	dispose(): void {
		// TextureInfo instances were created by this material, and should be disposed with it.
		this.baseColorTextureInfo.getChild().dispose();
		this.emissiveTextureInfo.getChild().dispose();
		this.normalTextureInfo.getChild().dispose();
		this.occlusionTextureInfo.getChild().dispose();
		this.metallicRoughnessTextureInfo.getChild().dispose();
		super.dispose();
	}

	/**********************************************************************************************
	 * Double-sided / culling.
	 */

	/** Returns true when both sides of triangles should be rendered. May impact performance. */
	public getDoubleSided(): boolean { return this._doubleSided; }

	/** Sets whether to render both sides of triangles. May impact performance. */
	public setDoubleSided(doubleSided: boolean): this {
		this._doubleSided = doubleSided;
		return this;
	}

	/**********************************************************************************************
	 * Alpha.
	 */

	/** Returns material alpha, equivalent to baseColorFactor[3]. */
	public getAlpha(): number { return this._baseColorFactor[3]; }

	/** Sets material alpha, equivalent to baseColorFactor[3]. */
	public setAlpha(alpha: number): this {
		this._baseColorFactor[3] = alpha;
		return this;
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
	 * - [glTF → material.alphaMode](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#materialalphamode)
	 */
	public getAlphaMode(): GLTF.MaterialAlphaMode { return this._alphaMode; }

	/** Sets the mode of the material's alpha channels. See {@link getAlphaMode} for details. */
	public setAlphaMode(alphaMode: GLTF.MaterialAlphaMode): this {
		this._alphaMode = alphaMode;
		return this;
	}

	/** Returns the visibility threshold; applied only when `.alphaMode='MASK'`. */
	public getAlphaCutoff(): number { return this._alphaCutoff; }

	/** Sets the visibility threshold; applied only when `.alphaMode='MASK'`. */
	public setAlphaCutoff(alphaCutoff: number): this {
		this._alphaCutoff = alphaCutoff;
		return this;
	}

	/**********************************************************************************************
	 * Base color.
	 */

	/** Base color / albedo factor in linear space. See {@link getBaseColorTexture}. */
	public getBaseColorFactor(): vec4 { return this._baseColorFactor; }

	/** Sets the base color / albedo factor in linear space. See {@link getBaseColorTexture}. */
	public setBaseColorFactor(baseColorFactor: vec4): this {
		this._baseColorFactor = baseColorFactor;
		return this;
	}

	/**
	 * Base color / albedo as hexadecimal in sRGB colorspace. Converted automatically from
	 * baseColorFactor in linear space. See {@link getBaseColorTexture}.
	 */
	public getBaseColorHex(): number {
		return ColorUtils.factorToHex(this._baseColorFactor);
	}

	/**
	 * Sets base color / albedo as hexadecimal in sRGB colorspace. Converted automatically to
	 * baseColorFactor in linear space. See {@link getBaseColorTexture}.
	 */
	public setBaseColorHex(hex: number): this {
		ColorUtils.hexToFactor(hex, this._baseColorFactor);
		return this;
	}

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
	public getBaseColorTexture(): Texture | null {
		return this.baseColorTexture ? this.baseColorTexture.getChild() : null;
	}

	/**
	 * Settings affecting the material's use of its base color texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getBaseColorTextureInfo(): TextureInfo | null {
		return this.baseColorTexture ? this.baseColorTextureInfo.getChild() : null;
	}

	/** Sets base color / albedo texture. See {@link getBaseColorTexture}. */
	public setBaseColorTexture(texture: Texture | null): this {
		this.baseColorTexture =
			this.graph.linkTexture('baseColorTexture', R | G | B | A, this, texture);
		return this;
	}

	/**********************************************************************************************
	 * Emissive.
	 */

	/** Emissive color; linear multiplier. See {@link getEmissiveTexture}. */
	public getEmissiveFactor(): vec3 { return this._emissiveFactor; }

	/** Sets the emissive color; linear multiplier. See {@link getEmissiveTexture}. */
	public setEmissiveFactor(emissiveFactor: vec3): this {
		this._emissiveFactor = emissiveFactor;
		return this;
	}

	/**
	 * Emissive as hexadecimal in sRGB colorspace. Converted automatically from
	 * emissiveFactor in linear space. See {@link getBaseColorTexture}.
	 */
	public getEmissiveHex(): number {
		return ColorUtils.factorToHex(this._emissiveFactor);
	}

	/**
	 * Sets emissive as hexadecimal in sRGB colorspace. Converted automatically to
	 * emissiveFactor in linear space. See {@link getEmissiveTexture}.
	 */
	public setEmissiveHex(hex: number): this {
		ColorUtils.hexToFactor(hex, this._emissiveFactor);
		return this;
	}

	/**
	 * Emissive texture. Emissive color is added to any base color of the material, after any
	 * lighting/shadowing are applied. An emissive color does not inherently "glow", or affect
	 * objects around it at all. To create that effect, most viewers must also enable a
	 * post-processing effect called "bloom".
	 *
	 * Reference:
	 * - [glTF → material.emissiveTexture](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#materialemissivetexture)
	 */
	public getEmissiveTexture(): Texture | null {
		return this.emissiveTexture ? this.emissiveTexture.getChild() : null;
	}

	/**
	 * Settings affecting the material's use of its emissive texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getEmissiveTextureInfo(): TextureInfo | null {
		return this.emissiveTexture ? this.emissiveTextureInfo.getChild() : null;
	}

	/** Sets emissive texture. See {@link getEmissiveTexture}. */
	public setEmissiveTexture(texture: Texture | null): this {
		this.emissiveTexture = this.graph.linkTexture('emissiveTexture', R | G | B, this, texture);
		return this;
	}

	/**********************************************************************************************
	 * Normal.
	 */

	/** Normal (surface detail) factor; linear multiplier. Affects `.normalTexture`. */
	public getNormalScale(): number { return this. _normalScale; }

	/** Sets normal (surface detail) factor; linear multiplier. Affects `.normalTexture`. */
	public setNormalScale(normalScale: number): this {
		this._normalScale = normalScale;
		return this;
	}

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
	public getNormalTexture(): Texture | null {
		return this.normalTexture ? this.normalTexture.getChild() : null;
	}

	/**
	 * Settings affecting the material's use of its normal texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getNormalTextureInfo(): TextureInfo | null {
		return this.normalTexture ? this.normalTextureInfo.getChild() : null;
	}

	/** Sets normal (surface detail) texture. See {@link getNormalTexture}. */
	public setNormalTexture(texture: Texture | null): this {
		this.normalTexture = this.graph.linkTexture('normalTexture', R | G | B, this, texture);
		return this;
	}

	/**********************************************************************************************
	 * Occlusion.
	 */

	/** (Ambient) Occlusion factor; linear multiplier. Affects `.occlusionTexture`. */
	public getOcclusionStrength(): number { return this._occlusionStrength; }

	/** Sets (ambient) occlusion factor; linear multiplier. Affects `.occlusionTexture`. */
	public setOcclusionStrength(occlusionStrength: number): this {
		this._occlusionStrength = occlusionStrength;
		return this;
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
	 * - [glTF → material.occlusionTexture](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#materialocclusiontexture)
	 */
	public getOcclusionTexture(): Texture | null {
		return this.occlusionTexture ? this.occlusionTexture.getChild() : null;
	}

	/**
	 * Settings affecting the material's use of its occlusion texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getOcclusionTextureInfo(): TextureInfo | null {
		return this.occlusionTexture ? this.occlusionTextureInfo.getChild() : null;
	}

	/** Sets (ambient) occlusion texture. See {@link getOcclusionTexture}. */
	public setOcclusionTexture(texture: Texture | null): this {
		this.occlusionTexture = this.graph.linkTexture('occlusionTexture', R, this, texture);
		return this;
	}

	/**********************************************************************************************
	 * Metallic / roughness.
	 */

	/**
	 * Roughness factor; linear multiplier. Affects roughness channel of
	 * `metallicRoughnessTexture`. See {@link getMetallicRoughnessTexture}.
	 */
	public getRoughnessFactor(): number { return this._roughnessFactor; }

	/**
	 * Sets roughness factor; linear multiplier. Affects roughness channel of
	 * `metallicRoughnessTexture`. See {@link getMetallicRoughnessTexture}.
	 */
	public setRoughnessFactor(roughnessFactor: number): this {
		this._roughnessFactor = roughnessFactor;
		return this;
	}

	/**
	 * Metallic factor; linear multiplier. Affects roughness channel of
	 * `metallicRoughnessTexture`. See {@link getMetallicRoughnessTexture}.
	 */
	public getMetallicFactor(): number { return this._metallicFactor; }

	/**
	 * Sets metallic factor; linear multiplier. Affects roughness channel of
	 * `metallicRoughnessTexture`. See {@link getMetallicRoughnessTexture}.
	 */
	public setMetallicFactor(metallicFactor: number): this {
		this._metallicFactor = metallicFactor;
		return this;
	}

	/**
	 * Metallic roughness texture. The metalness values are sampled from the B channel. The
	 * roughness values are sampled from the G channel. When a material is fully metallic,
	 * or nearly so, it may require image-based lighting (i.e. an environment map) or global
	 * illumination to appear well-lit.
	 *
	 * Reference:
	 * - [glTF → material.pbrMetallicRoughness.metallicRoughnessTexture](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#pbrmetallicroughnessmetallicroughnesstexture)
	 */
	public getMetallicRoughnessTexture(): Texture | null {
		return this.metallicRoughnessTexture ? this.metallicRoughnessTexture.getChild() : null;
	}

	/**
	 * Settings affecting the material's use of its metallic/roughness texture. If no texture is
	 * attached, {@link TextureInfo} is `null`.
	 */
	public getMetallicRoughnessTextureInfo(): TextureInfo | null {
		return this.metallicRoughnessTexture ? this.metallicRoughnessTextureInfo.getChild() : null;
	}

	/** Sets metallic/roughness texture. See {@link getMetallicRoughnessTexture}. */
	public setMetallicRoughnessTexture(texture: Texture | null): this {
		this.metallicRoughnessTexture =
			this.graph.linkTexture('metallicRoughnessTexture', G | B, this, texture);
		return this;
	}
}
