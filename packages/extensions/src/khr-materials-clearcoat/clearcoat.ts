import { COPY_IDENTITY, ExtensionProperty, GraphChild, PropertyType, Texture, TextureInfo, TextureLink } from '@gltf-transform/core';
import { KHR_MATERIALS_CLEARCOAT } from '../constants';

/** Documentation in {@link EXTENSIONS.md}. */
export class Clearcoat extends ExtensionProperty {
	public readonly propertyType = 'Clearcoat';
	public readonly parentTypes = [PropertyType.MATERIAL];
	public readonly extensionName = KHR_MATERIALS_CLEARCOAT;
	public static EXTENSION_NAME = KHR_MATERIALS_CLEARCOAT;

	private _clearcoatFactor = 0.0;
	private _clearcoatRoughnessFactor = 0.0;
	private _clearcoatNormalScale = 1.0;

	@GraphChild private clearcoatTexture: TextureLink = null;
	@GraphChild private clearcoatRoughnessTexture: TextureLink = null;
	@GraphChild private clearcoatNormalTexture: TextureLink = null;

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this._clearcoatFactor = other._clearcoatFactor;
		this._clearcoatRoughnessFactor = other._clearcoatRoughnessFactor;
		this._clearcoatNormalScale = other._clearcoatNormalScale;

		if (other.clearcoatTexture) {
			this.setClearcoatTexture(resolve(other.clearcoatTexture.getChild()));
			this.clearcoatTexture.copy(other.clearcoatTexture);
		}
		if (other.clearcoatRoughnessTexture) {
			this.setClearcoatRoughnessTexture(resolve(other.clearcoatRoughnessTexture.getChild()));
			this.clearcoatRoughnessTexture.copy(other.clearcoatRoughnessTexture);
		}
		if (other.clearcoatNormalTexture) {
			this.setClearcoatNormalTexture(resolve(other.clearcoatNormalTexture.getChild()));
			this.clearcoatNormalTexture.copy(other.clearcoatNormalTexture);
		}

		return this;
	}

	/**********************************************************************************************
	 * Clearcoat.
	 */

	/** Clearcoat; linear multiplier. See {@link getClearcoatTexture}. */
	public getClearcoatFactor(): number { return this._clearcoatFactor; }

	/** Clearcoat; linear multiplier. See {@link getClearcoatTexture}. */
	public setClearcoatFactor(clearcoatFactor: number): this {
		this._clearcoatFactor = clearcoatFactor;
		return this;
	}

	/**
	 * Clearcoat texture; linear multiplier. The `r` channel of this texture specifies an amount
	 * [0-1] of coating over the surface of the material, which may have its own roughness and
	 * normal map properties.
	 */
	public getClearcoatTexture(): Texture {
		return this.clearcoatTexture ? this.clearcoatTexture.getChild() : null;
	}

	/**
	 * Settings affecting the material's use of its clearcoat texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getClearcoatTextureInfo(): TextureInfo {
		return this.clearcoatTexture ? this.clearcoatTexture.getTextureInfo() : null;
	}

	/** Sets clearcoat texture. See {@link getClearcoatTexture}. */
	public setClearcoatTexture(texture: Texture): this {
		this.clearcoatTexture = this.graph.linkTexture('clearcoatTexture', this, texture);
		return this;
	}

	/**********************************************************************************************
	 * Clearcoat roughness.
	 */

	/** Clearcoat roughness; linear multiplier. See {@link getClearcoatRoughnessTexture}. */
	public getClearcoatRoughnessFactor(): number { return this._clearcoatRoughnessFactor; }

	/** Clearcoat roughness; linear multiplier. See {@link getClearcoatRoughnessTexture}. */
	public setClearcoatRoughnessFactor(clearcoatRoughnessFactor: number): this {
		this._clearcoatRoughnessFactor = clearcoatRoughnessFactor;
		return this;
	}

	/**
	 * Clearcoat roughness texture; linear multiplier. The `g` channel of this texture specifies
	 * roughness, independent of the base layer's roughness.
	 */
	public getClearcoatRoughnessTexture(): Texture {
		return this.clearcoatRoughnessTexture ? this.clearcoatRoughnessTexture.getChild() : null;
	}

	/**
	 * Settings affecting the material's use of its clearcoat roughness texture. If no texture is
	 * attached, {@link TextureInfo} is `null`.
	 */
	public getClearcoatRoughnessTextureInfo(): TextureInfo {
		return this.clearcoatRoughnessTexture ? this.clearcoatRoughnessTexture.getTextureInfo() : null;
	}

	/** Sets clearcoat roughness texture. See {@link getClearcoatRoughnessTexture}. */
	public setClearcoatRoughnessTexture(texture: Texture): this {
		this.clearcoatRoughnessTexture = this.graph.linkTexture('clearcoatRoughnessTexture', this, texture);
		return this;
	}

	/**********************************************************************************************
	 * Clearcoat normals.
	 */

	/** Clearcoat normal scale. See {@link getClearcoatNormalTexture}. */
	public getClearcoatNormalScale(): number { return this._clearcoatNormalScale; }

	/** Clearcoat normal scale. See {@link getClearcoatNormalTexture}. */
	public setClearcoatNormalScale(clearcoatNormalScale: number): this {
		this._clearcoatNormalScale = clearcoatNormalScale;
		return this;
	}

	/**
	 * Clearcoat normal map. Independent of the material base layer normal map.
	 */
	public getClearcoatNormalTexture(): Texture {
		return this.clearcoatNormalTexture ? this.clearcoatNormalTexture.getChild() : null;
	}

	/**
	 * Settings affecting the material's use of its clearcoat normal texture. If no texture is
	 * attached, {@link TextureInfo} is `null`.
	 */
	public getClearcoatNormalTextureInfo(): TextureInfo {
		return this.clearcoatNormalTexture ? this.clearcoatNormalTexture.getTextureInfo() : null;
	}

	/** Sets clearcoat normal texture. See {@link getClearcoatNormalTexture}. */
	public setClearcoatNormalTexture(texture: Texture): this {
		this.clearcoatNormalTexture = this.graph.linkTexture('clearcoatNormalTexture', this, texture);
		return this;
	}
}
