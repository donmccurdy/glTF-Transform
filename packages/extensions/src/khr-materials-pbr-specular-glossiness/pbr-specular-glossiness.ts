import { COPY_IDENTITY, ExtensionProperty, GraphChild, PropertyType, Texture, TextureInfo, TextureLink, TextureSampler, vec3, vec4 } from '@gltf-transform/core';
import { KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS } from '../constants';

/** Documentation in {@link EXTENSIONS.md}. */
export class PBRSpecularGlossiness extends ExtensionProperty {
	public readonly propertyType = 'PBRSpecularGlossiness';
	public readonly parentTypes = [PropertyType.MATERIAL];
	public readonly extensionName = KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS;
	public static EXTENSION_NAME = KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS;

	private _diffuseFactor: vec4 = [1.0, 1.0, 1.0, 1.0];
	private _specularFactor: vec3 = [1.0, 1.0, 1.0];
	private _glossinessFactor = 1.0;

	@GraphChild private diffuseTexture: TextureLink = null;
	@GraphChild private specularGlossinessTexture: TextureLink = null;

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this._diffuseFactor = other._diffuseFactor;
		this._specularFactor = other._specularFactor;
		this._glossinessFactor = other._glossinessFactor;


		if (other.diffuseTexture) {
			this.setDiffuseTexture(resolve(other.diffuseTexture.getChild()));
			this.diffuseTexture.copy(other.diffuseTexture);
		}
		if (other.specularGlossinessTexture) {
			this.setSpecularGlossinessTexture(resolve(other.specularGlossinessTexture.getChild()));
			this.specularGlossinessTexture.copy(other.specularGlossinessTexture);
		}

		return this;
	}

	/**********************************************************************************************
	 * Diffuse.
	 */

	/** Diffuse; linear multiplier. See {@link getDiffuseTexture}. */
	public getDiffuseFactor(): vec4 { return this._diffuseFactor; }

	/** Diffuse; linear multiplier. See {@link getDiffuseTexture}. */
	public setDiffuseFactor(diffuseFactor: vec4): this {
		this._diffuseFactor = diffuseFactor;
		return this;
	}

	/**
	 * Diffuse texture; linear multiplier.
	 */
	public getDiffuseTexture(): Texture {
		return this.diffuseTexture ? this.diffuseTexture.getChild() : null;
	}

	/**
	 * Settings affecting the material's use of its diffuse texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getDiffuseTextureInfo(): TextureInfo {
		return this.diffuseTexture ? this.diffuseTexture.textureInfo : null;
	}

	/**
	 * Settings affecting the material's use of its diffuse texture. If no texture is attached,
	 * {@link TextureSampler} is `null`.
	 */
	public getDiffuseTextureSampler(): TextureSampler {
		return this.diffuseTexture ? this.diffuseTexture.sampler : null;
	}

	/** Sets diffuse texture. See {@link getDiffuseTexture}. */
	public setDiffuseTexture(texture: Texture): this {
		this.diffuseTexture = this.graph.linkTexture('diffuseTexture', this, texture);
		return this;
	}

	/**********************************************************************************************
	 * Specular.
	 */

	/** Specular; linear multiplier. */
	public getSpecularFactor(): vec3 { return this._specularFactor; }

	/** Specular; linear multiplier. */
	public setSpecularFactor(specularFactor: vec3): this {
		this._specularFactor = specularFactor;
		return this;
	}

	/**********************************************************************************************
	 * Glossiness.
	 */

	/** Glossiness; linear multiplier. See {@link getGlossinessTexture}. */
	public getGlossinessFactor(): number { return this._glossinessFactor; }

	/** Glossiness; linear multiplier. See {@link getGlossinessTexture}. */
	public setGlossinessFactor(glossinessFactor: number): this {
		this._glossinessFactor = glossinessFactor;
		return this;
	}

	/**********************************************************************************************
	 * Specular/Glossiness.
	 */

	/** Spec/gloss texture; linear multiplier. */
	public getSpecularGlossinessTexture(): Texture {
		return this.specularGlossinessTexture ? this.specularGlossinessTexture.getChild() : null;
	}

	/**
	 * Settings affecting the material's use of its spec/gloss texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getSpecularGlossinessTextureInfo(): TextureInfo {
		return this.specularGlossinessTexture ? this.specularGlossinessTexture.textureInfo : null;
	}

	/**
	 * Settings affecting the material's use of its spec/gloss texture. If no texture is attached,
	 * {@link TextureSampler} is `null`.
	 */
	public getSpecularGlossinessTextureSampler(): TextureSampler {
		return this.specularGlossinessTexture ? this.specularGlossinessTexture.sampler : null;
	}

	/** Spec/gloss texture; linear multiplier. */
	public setSpecularGlossinessTexture(texture: Texture): this {
		this.specularGlossinessTexture = this.graph.linkTexture('specularGlossinessTexture', this, texture);
		return this;
	}
}
