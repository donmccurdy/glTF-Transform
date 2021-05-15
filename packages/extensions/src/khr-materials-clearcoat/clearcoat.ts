import { COPY_IDENTITY, ExtensionProperty, GraphChild, Link, PropertyType, Texture, TextureChannel, TextureInfo, TextureLink } from '@gltf-transform/core';
import { KHR_MATERIALS_CLEARCOAT } from '../constants';

const { R, G, B } = TextureChannel;

/**
 * # Clearcoat
 *
 * Defines clear coat for a PBR material. See {@link MaterialsClearcoat}.
 */
export class Clearcoat extends ExtensionProperty {
	public readonly propertyType = 'Clearcoat';
	public readonly parentTypes = [PropertyType.MATERIAL];
	public readonly extensionName = KHR_MATERIALS_CLEARCOAT;
	public static EXTENSION_NAME = KHR_MATERIALS_CLEARCOAT;

	private _clearcoatFactor = 0.0;
	private _clearcoatRoughnessFactor = 0.0;
	private _clearcoatNormalScale = 1.0;

	@GraphChild private clearcoatTexture: TextureLink | null = null;
	@GraphChild private clearcoatTextureInfo: Link<this, TextureInfo> =
		this.graph.link('clearcoatTextureInfo', this, new TextureInfo(this.graph));

	@GraphChild private clearcoatRoughnessTexture: TextureLink | null = null;
	@GraphChild private clearcoatRoughnessTextureInfo: Link<this, TextureInfo> =
		this.graph.link('clearcoatRoughnessTextureInfo', this, new TextureInfo(this.graph));

	@GraphChild private clearcoatNormalTexture: TextureLink | null = null;
	@GraphChild private clearcoatNormalTextureInfo: Link<this, TextureInfo> =
		this.graph.link('clearcoatNormalTextureInfo', this, new TextureInfo(this.graph));

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this._clearcoatFactor = other._clearcoatFactor;
		this._clearcoatRoughnessFactor = other._clearcoatRoughnessFactor;
		this._clearcoatNormalScale = other._clearcoatNormalScale;

		this.setClearcoatTexture(
			other.clearcoatTexture
				? resolve(other.clearcoatTexture.getChild())
				: null
		);
		this.clearcoatTextureInfo.getChild()
			.copy(resolve(other.clearcoatTextureInfo.getChild()), resolve);

		this.setClearcoatRoughnessTexture(
			other.clearcoatRoughnessTexture
				? resolve(other.clearcoatRoughnessTexture.getChild())
				: null
		);
		this.clearcoatRoughnessTextureInfo.getChild()
			.copy(resolve(other.clearcoatRoughnessTextureInfo.getChild()), resolve);

		this.setClearcoatNormalTexture(
			other.clearcoatNormalTexture
				? resolve(other.clearcoatNormalTexture.getChild())
				: null
		);
		this.clearcoatNormalTextureInfo.getChild()
			.copy(resolve(other.clearcoatNormalTextureInfo.getChild()), resolve);

		return this;
	}

	public dispose(): void {
		this.clearcoatTextureInfo.getChild().dispose();
		this.clearcoatRoughnessTextureInfo.getChild().dispose();
		this.clearcoatNormalTextureInfo.getChild().dispose();
		super.dispose();
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
	public getClearcoatTexture(): Texture | null {
		return this.clearcoatTexture ? this.clearcoatTexture.getChild() : null;
	}

	/**
	 * Settings affecting the material's use of its clearcoat texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getClearcoatTextureInfo(): TextureInfo | null {
		return this.clearcoatTexture ? this.clearcoatTextureInfo.getChild() : null;
	}

	/** Sets clearcoat texture. See {@link getClearcoatTexture}. */
	public setClearcoatTexture(texture: Texture | null): this {
		this.clearcoatTexture = this.graph.linkTexture('clearcoatTexture', R, this, texture);
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
	public getClearcoatRoughnessTexture(): Texture | null {
		return this.clearcoatRoughnessTexture ? this.clearcoatRoughnessTexture.getChild() : null;
	}

	/**
	 * Settings affecting the material's use of its clearcoat roughness texture. If no texture is
	 * attached, {@link TextureInfo} is `null`.
	 */
	public getClearcoatRoughnessTextureInfo(): TextureInfo | null {
		return this.clearcoatRoughnessTexture
			? this.clearcoatRoughnessTextureInfo.getChild()
			: null;
	}

	/** Sets clearcoat roughness texture. See {@link getClearcoatRoughnessTexture}. */
	public setClearcoatRoughnessTexture(texture: Texture | null): this {
		this.clearcoatRoughnessTexture
			= this.graph.linkTexture('clearcoatRoughnessTexture', G, this, texture);
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
	public getClearcoatNormalTexture(): Texture | null {
		return this.clearcoatNormalTexture ? this.clearcoatNormalTexture.getChild() : null;
	}

	/**
	 * Settings affecting the material's use of its clearcoat normal texture. If no texture is
	 * attached, {@link TextureInfo} is `null`.
	 */
	public getClearcoatNormalTextureInfo(): TextureInfo | null {
		return this.clearcoatNormalTexture ? this.clearcoatNormalTextureInfo.getChild() : null;
	}

	/** Sets clearcoat normal texture. See {@link getClearcoatNormalTexture}. */
	public setClearcoatNormalTexture(texture: Texture | null): this {
		this.clearcoatNormalTexture =
			this.graph.linkTexture('clearcoatNormalTexture', R | G | B, this, texture);
		return this;
	}
}
