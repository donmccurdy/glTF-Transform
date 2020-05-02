import { vec3, vec4 } from '../constants';
import { GraphChild } from '../graph/index';
import { Property } from './property';
import { TextureLink } from './property-links';
import { Texture, TextureInfo, TextureSampler } from './texture';

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
 * ```
 * const material = container.createElement('myMaterial')
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
export class Material extends Property {
	/** Mode of the material's alpha channels. (`OPAQUE`, `BLEND`, or `MASK`) */
	private alphaMode: GLTF.MaterialAlphaMode = GLTF.MaterialAlphaMode.OPAQUE;

	/** Visibility threshold. Applied only when `.alphaMode='MASK'`. */
	private alphaCutoff = 0.5;

	/** When true, both sides of each triangle are rendered. May decrease performance. */
	private doubleSided = false;

	/** Base color / albedo; linear multiplier. */
	private baseColorFactor: vec4 = [1, 1, 1, 1];

	/** Emissive color; linear multiplier. */
	private emissiveFactor: vec3 = [0, 0, 0];

	/** Normal (surface detail) factor; linear multiplier. Affects `.normalTexture`. */
	private normalScale = 1;

	/** (Ambient) Occlusion factor; linear multiplier. Affects `.occlusionMap`. */
	private occlusionStrength = 1;

	/**
	 * Roughness factor; linear multiplier. Affects roughness channel of
	 * `metallicRoughnessTexture`.
	 */
	private roughnessFactor = 1;

	/**
	 * Metallic factor; linear multiplier. Affects metallic channel of
	 * `metallicRoughnessTexture`.
	 */
	private metallicFactor = 1;

	/** Base color / albedo texture. */
	@GraphChild private baseColorTexture: TextureLink = null;

	/** Emissive texture. */
	@GraphChild private emissiveTexture: TextureLink = null;

	/**
	 * Normal (surface detail) texture. Normal maps often suffer artifacts with JPEG compression,
	 * so PNG files are preferred.
	 */
	@GraphChild private normalTexture: TextureLink = null;

	/**
	 * (Ambient) Occlusion texture. Occlusion data is stored in the `.r` channel, allowing this
	 * texture to be packed with `metallicRoughnessTexture`, optionally.
	 */
	@GraphChild private occlusionTexture: TextureLink = null;

	/**
	 * Metallic/roughness PBR texture. Roughness data is stored in the `.g` channel and metallic
	 * data is stored in the `.b` channel, allowing thist exture to be packed with
	 * `occlusionTexture`, optionally.
	*/
	@GraphChild private metallicRoughnessTexture: TextureLink = null;

	/**********************************************************************************************
	 * Double-sided / culling.
	 */

	/** Returns true when both sides of triangles should be rendered. May impact performance. */
	public getDoubleSided(): boolean { return this.doubleSided; }

	/** Sets whether to render both sides of triangles. May impact performance. */
	public setDoubleSided(doubleSided: boolean): Material {
		this.doubleSided = doubleSided;
		return this;
	}

	/**********************************************************************************************
	 * Alpha.
	 */

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
	public getAlphaMode(): GLTF.MaterialAlphaMode { return this.alphaMode; }

	/** Sets the mode of the material's alpha channels. See {@link getAlphaMode} for details. */
	public setAlphaMode(alphaMode: GLTF.MaterialAlphaMode): Material {
		this.alphaMode = alphaMode;
		return this;
	}

	/** Returns the visibility threshold; applied only when `.alphaMode='MASK'`. */
	public getAlphaCutoff(): number { return this.alphaCutoff; }

	/** Sets the visibility threshold; applied only when `.alphaMode='MASK'`. */
	public setAlphaCutoff(alphaCutoff: number): Material {
		this.alphaCutoff = alphaCutoff;
		return this;
	}

	/**********************************************************************************************
	 * Base color.
	 */

	/** Base color / albedo; linear multiplier. See {@link getBaseColorTexture}. */
	public getBaseColorFactor(): vec4 { return this.baseColorFactor; }

	/** Sets the base color / albedo; linear multiplier. See {@link getBaseColorTexture}. */
	public setBaseColorFactor(baseColorFactor: vec4): Material {
		this.baseColorFactor = baseColorFactor;
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
	public getBaseColorTexture(): Texture {
		return this.baseColorTexture ? this.baseColorTexture.getChild() : null;
	}

	/**
	 * Settings affecting the material's use of its base color texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getBaseColorTextureInfo(): TextureInfo {
		return this.baseColorTexture ? this.baseColorTexture.textureInfo : null;
	}

	/**
	 * Settings affecting the material's use of its base color texture. If no texture is attached,
	 * {@link TextureSampler} is `null`.
	 */
	public getBaseColorTextureSampler(): TextureSampler {
		return this.baseColorTexture ? this.baseColorTexture.sampler : null;
	}

	/** Sets base color / albedo texture. See {@link getBaseColorTexture}. */
	public setBaseColorTexture(texture: Texture): Material {
		this.baseColorTexture = this.graph.linkTexture('baseColorTexture', this, texture);
		return this;
	}

	/**********************************************************************************************
	 * Emissive.
	 */

	/** Emissive color; linear multiplier. See {@link getEmissiveTexture}. */
	public getEmissiveFactor(): vec3 { return this.emissiveFactor; }

	/** Sets the emissive color; linear multiplier. See {@link getEmissiveTexture}. */
	public setEmissiveFactor(emissiveFactor: vec3): Material {
		this.emissiveFactor = emissiveFactor;
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
	public getEmissiveTexture(): Texture {
		return this.emissiveTexture ? this.emissiveTexture.getChild() : null;
	}

	/**
	 * Settings affecting the material's use of its emissive texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getEmissiveTextureInfo(): TextureInfo {
		return this.emissiveTexture ? this.emissiveTexture.textureInfo : null;
	}

	/**
	 * Settings affecting the material's use of its emissive texture. If no texture is attached,
	 * {@link TextureSampler} is `null`.
	 */
	public getEmissiveTextureSampler(): TextureSampler {
		return this.emissiveTexture ? this.emissiveTexture.sampler : null;
	}

	/** Sets emissive texture. See {@link getEmissiveTexture}. */
	public setEmissiveTexture(texture: Texture): Material {
		this.emissiveTexture = this.graph.linkTexture('emissiveTexture', this, texture);
		return this;
	}

	/**********************************************************************************************
	 * Normal.
	 */

	/** Normal (surface detail) factor; linear multiplier. Affects `.normalTexture`. */
	public getNormalScale(): number { return this. normalScale; }

	/** Sets normal (surface detail) factor; linear multiplier. Affects `.normalTexture`. */
	public setNormalScale(normalScale: number): Material {
		this.normalScale = normalScale;
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
	public getNormalTexture(): Texture {
		return this.normalTexture ? this.normalTexture.getChild() : null;
	}

	/**
	 * Settings affecting the material's use of its normal texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getNormalTextureInfo(): TextureInfo {
		return this.normalTexture ? this.normalTexture.textureInfo : null;
	}

	/**
	 * Settings affecting the material's use of its normal texture. If no texture is attached,
	 * {@link TextureSampler} is `null`.
	 */
	public getNormalTextureSampler(): TextureSampler {
		return this.normalTexture ? this.normalTexture.sampler : null;
	}

	/** Sets normal (surface detail) texture. See {@link getNormalTexture}. */
	public setNormalTexture(texture: Texture): Material {
		this.normalTexture = this.graph.linkTexture('normalTexture', this, texture);
		return this;
	}

	/**********************************************************************************************
	 * Occlusion.
	 */

	/** (Ambient) Occlusion factor; linear multiplier. Affects `.occlusionTexture`. */
	public getOcclusionStrength(): number { return this.occlusionStrength; }

	/** Sets (ambient) occlusion factor; linear multiplier. Affects `.occlusionTexture`. */
	public setOcclusionStrength(occlusionStrength: number): Material {
		this.occlusionStrength = occlusionStrength;
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
	public getOcclusionTexture(): Texture {
		return this.occlusionTexture ? this.occlusionTexture.getChild() : null;
	}

	/**
	 * Settings affecting the material's use of its occlusion texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getOcclusionTextureInfo(): TextureInfo {
		return this.occlusionTexture ? this.occlusionTexture.textureInfo : null;
	}

	/**
	 * Settings affecting the material's use of its occlusion texture. If no texture is attached,
	 * {@link TextureSampler} is `null`.
	 */
	public getOcclusionTextureSampler(): TextureSampler {
		return this.occlusionTexture ? this.occlusionTexture.sampler : null;
	}

	/** Sets (ambient) occlusion texture. See {@link getOcclusionTexture}. */
	public setOcclusionTexture(texture: Texture): Material {
		this.occlusionTexture = this.graph.linkTexture('occlusionTexture', this, texture);
		return this;
	}

	/**********************************************************************************************
	 * Metallic / roughness.
	 */

	/**
	 * Roughness factor; linear multiplier. Affects roughness channel of
	 * `metallicRoughnessTexture`. See {@link getMetallicRoughnessTexture}.
	 */
	public getRoughnessFactor(): number { return this.roughnessFactor; }

	/**
	 * Sets roughness factor; linear multiplier. Affects roughness channel of
	 * `metallicRoughnessTexture`. See {@link getMetallicRoughnessTexture}.
	 */
	public setRoughnessFactor(roughnessFactor: number): Material {
		this.roughnessFactor = roughnessFactor;
		return this;
	}

	/**
	 * Metallic factor; linear multiplier. Affects roughness channel of
	 * `metallicRoughnessTexture`. See {@link getMetallicRoughnessTexture}.
	 */
	public getMetallicFactor(): number { return this.metallicFactor; }

	/**
	 * Sets metallic factor; linear multiplier. Affects roughness channel of
	 * `metallicRoughnessTexture`. See {@link getMetallicRoughnessTexture}.
	 */
	public setMetallicFactor(metallicFactor: number): Material {
		this.metallicFactor = metallicFactor;
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
	public getMetallicRoughnessTexture(): Texture {
		return this.metallicRoughnessTexture ? this.metallicRoughnessTexture.getChild() : null;
	}

	/**
	 * Settings affecting the material's use of its metallic/roughness texture. If no texture is
	 * attached, {@link TextureInfo} is `null`.
	 */
	public getMetallicRoughnessTextureInfo(): TextureInfo {
		return this.metallicRoughnessTexture ? this.metallicRoughnessTexture.textureInfo : null;
	}

	/**
	 * Settings affecting the material's use of its metallic/roughness texture. If no texture is
	 * attached, {@link TextureSampler} is `null`.
	 */
	public getMetallicRoughnessTextureSampler(): TextureSampler {
		return this.metallicRoughnessTexture ? this.metallicRoughnessTexture.sampler : null;
	}

	/** Sets metallic/roughness texture. See {@link getMetallicRoughnessTexture}. */
	public setMetallicRoughnessTexture(texture: Texture): Material {
		this.metallicRoughnessTexture = this.graph.linkTexture('metallicRoughnessTexture', this, texture);
		return this;
	}
}
