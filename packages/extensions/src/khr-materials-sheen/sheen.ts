import { COPY_IDENTITY, ColorUtils, ExtensionProperty, GraphChild, Link, PropertyType, Texture, TextureChannel, TextureInfo, TextureLink, vec3 } from '@gltf-transform/core';
import { KHR_MATERIALS_SHEEN } from '../constants';

const { R, G, B, A } = TextureChannel;

/**
 * # Sheen
 *
 * Defines sheen on a PBR {@link Material}. See {@link MaterialsSheen}.
 */
export class Sheen extends ExtensionProperty {
	public readonly propertyType = 'Sheen';
	public readonly parentTypes = [PropertyType.MATERIAL];
	public readonly extensionName = KHR_MATERIALS_SHEEN;
	public static EXTENSION_NAME = KHR_MATERIALS_SHEEN;

	private _sheenColorFactor: vec3 = [0.0, 0.0, 0.0];
	private _sheenRoughnessFactor = 0.0;

	@GraphChild private sheenColorTexture: TextureLink | null = null;
	@GraphChild private sheenColorTextureInfo: Link<this, TextureInfo> =
		this.graph.link('sheenColorTextureInfo', this, new TextureInfo(this.graph));

	@GraphChild private sheenRoughnessTexture: TextureLink | null = null;
	@GraphChild private sheenRoughnessTextureInfo: Link<this, TextureInfo> =
		this.graph.link('sheenRoughnessTextureInfo', this, new TextureInfo(this.graph));

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this._sheenColorFactor = other._sheenColorFactor;
		this._sheenRoughnessFactor = other._sheenRoughnessFactor;

		this.setSheenColorTexture(
			other.sheenColorTexture
				? resolve(other.sheenColorTexture.getChild())
				: null
		);
		this.sheenColorTextureInfo.getChild()
			.copy(resolve(other.sheenColorTextureInfo.getChild()), resolve);

		this.setSheenRoughnessTexture(
			other.sheenRoughnessTexture
				? resolve(other.sheenRoughnessTexture.getChild())
				: null
		);
		this.sheenRoughnessTextureInfo.getChild()
			.copy(resolve(other.sheenRoughnessTextureInfo.getChild()), resolve);

		return this;
	}

	public dispose(): void {
		this.sheenColorTextureInfo.getChild().dispose();
		this.sheenRoughnessTextureInfo.getChild().dispose();
		super.dispose();
	}

	/**********************************************************************************************
	 * Sheen color.
	 */

	/** Sheen; linear multiplier. */
	public getSheenColorFactor(): vec3 { return this._sheenColorFactor; }

	/** Sheen; hex color in sRGB colorspace. */
	public getSheenColorHex(): number { return ColorUtils.factorToHex(this._sheenColorFactor); }

	/** Sheen; linear multiplier. */
	public setSheenColorFactor(sheenColorFactor: vec3): this {
		this._sheenColorFactor = sheenColorFactor;
		return this;
	}

	/** Sheen; hex color in sRGB colorspace. */
	public setSheenColorHex(hex: number): this {
		ColorUtils.hexToFactor(hex, this._sheenColorFactor);
		return this;
	}

	/**
	 * Sheen color texture, in sRGB colorspace.
	 */
	public getSheenColorTexture(): Texture | null {
		return this.sheenColorTexture ? this.sheenColorTexture.getChild() : null;
	}

	/**
	 * Settings affecting the material's use of its sheen color texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getSheenColorTextureInfo(): TextureInfo | null {
		return this.sheenColorTexture ? this.sheenColorTextureInfo.getChild() : null;
	}

	/** Sets sheen color texture. See {@link getSheenColorTexture}. */
	public setSheenColorTexture(texture: Texture | null): this {
		this.sheenColorTexture =
			this.graph.linkTexture('sheenColorTexture', R | G | B, this, texture);
		return this;
	}

	/**********************************************************************************************
	 * Sheen roughness.
	 */

	/** Sheen roughness; linear multiplier. See {@link getSheenRoughnessTexture}. */
	public getSheenRoughnessFactor(): number { return this._sheenRoughnessFactor; }

	/** Sheen roughness; linear multiplier. See {@link getSheenRoughnessTexture}. */
	public setSheenRoughnessFactor(sheenRoughnessFactor: number): this {
		this._sheenRoughnessFactor = sheenRoughnessFactor;
		return this;
	}

	/**
	 * Sheen roughness texture; linear multiplier. The `a` channel of this texture specifies
	 * roughness, independent of the base layer's roughness.
	 */
	public getSheenRoughnessTexture(): Texture | null {
		return this.sheenRoughnessTexture ? this.sheenRoughnessTexture.getChild() : null;
	}

	/**
	 * Settings affecting the material's use of its sheen roughness texture. If no texture is
	 * attached, {@link TextureInfo} is `null`.
	 */
	public getSheenRoughnessTextureInfo(): TextureInfo | null {
		return this.sheenRoughnessTexture ? this.sheenRoughnessTextureInfo.getChild() : null;
	}

	/**
	 * Sets sheen roughness texture.  The `a` channel of this texture specifies
	 * roughness, independent of the base layer's roughness.
	 */
	public setSheenRoughnessTexture(texture: Texture | null): this {
		this.sheenRoughnessTexture =
			this.graph.linkTexture('sheenRoughnessTexture', A, this, texture);
		return this;
	}
}
