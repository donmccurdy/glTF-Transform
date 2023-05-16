import {
	ExtensionProperty,
	IProperty,
	Nullable,
	PropertyType,
	Texture,
	TextureChannel,
	TextureInfo,
} from '@gltf-transform/core';
import { KHR_MATERIALS_CLEARCOAT } from '../constants.js';

interface IClearcoat extends IProperty {
	clearcoatFactor: number;
	clearcoatTexture: Texture;
	clearcoatTextureInfo: TextureInfo;

	clearcoatRoughnessFactor: number;
	clearcoatRoughnessTexture: Texture;
	clearcoatRoughnessTextureInfo: TextureInfo;

	clearcoatNormalScale: number;
	clearcoatNormalTexture: Texture;
	clearcoatNormalTextureInfo: TextureInfo;
}

const { R, G, B } = TextureChannel;

/**
 * Defines clear coat for a PBR material. See {@link KHRMaterialsClearcoat}.
 */
export class Clearcoat extends ExtensionProperty<IClearcoat> {
	public static EXTENSION_NAME = KHR_MATERIALS_CLEARCOAT;
	public declare extensionName: typeof KHR_MATERIALS_CLEARCOAT;
	public declare propertyType: 'Clearcoat';
	public declare parentTypes: [PropertyType.MATERIAL];

	protected init(): void {
		this.extensionName = KHR_MATERIALS_CLEARCOAT;
		this.propertyType = 'Clearcoat';
		this.parentTypes = [PropertyType.MATERIAL];
	}

	protected getDefaults(): Nullable<IClearcoat> {
		return Object.assign(super.getDefaults() as IProperty, {
			clearcoatFactor: 0,
			clearcoatTexture: null,
			clearcoatTextureInfo: new TextureInfo(this.graph, 'clearcoatTextureInfo'),

			clearcoatRoughnessFactor: 0,
			clearcoatRoughnessTexture: null,
			clearcoatRoughnessTextureInfo: new TextureInfo(this.graph, 'clearcoatRoughnessTextureInfo'),

			clearcoatNormalScale: 1,
			clearcoatNormalTexture: null,
			clearcoatNormalTextureInfo: new TextureInfo(this.graph, 'clearcoatNormalTextureInfo'),
		});
	}

	/**********************************************************************************************
	 * Clearcoat.
	 */

	/** Clearcoat; linear multiplier. See {@link Clearcoat.getClearcoatTexture getClearcoatTexture}. */
	public getClearcoatFactor(): number {
		return this.get('clearcoatFactor');
	}

	/** Clearcoat; linear multiplier. See {@link Clearcoat.getClearcoatTexture getClearcoatTexture}. */
	public setClearcoatFactor(factor: number): this {
		return this.set('clearcoatFactor', factor);
	}

	/**
	 * Clearcoat texture; linear multiplier. The `r` channel of this texture specifies an amount
	 * [0-1] of coating over the surface of the material, which may have its own roughness and
	 * normal map properties.
	 */
	public getClearcoatTexture(): Texture | null {
		return this.getRef('clearcoatTexture');
	}

	/**
	 * Settings affecting the material's use of its clearcoat texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getClearcoatTextureInfo(): TextureInfo | null {
		return this.getRef('clearcoatTexture') ? this.getRef('clearcoatTextureInfo') : null;
	}

	/** Sets clearcoat texture. See {@link Clearcoat.getClearcoatTexture getClearcoatTexture}. */
	public setClearcoatTexture(texture: Texture | null): this {
		return this.setRef('clearcoatTexture', texture, { channels: R });
	}

	/**********************************************************************************************
	 * Clearcoat roughness.
	 */

	/**
	 * Clearcoat roughness; linear multiplier.
	 * See {@link Clearcoat.getClearcoatRoughnessTexture getClearcoatRoughnessTexture}.
	 */
	public getClearcoatRoughnessFactor(): number {
		return this.get('clearcoatRoughnessFactor');
	}

	/**
	 * Clearcoat roughness; linear multiplier.
	 * See {@link Clearcoat.getClearcoatRoughnessTexture getClearcoatRoughnessTexture}.
	 */
	public setClearcoatRoughnessFactor(factor: number): this {
		return this.set('clearcoatRoughnessFactor', factor);
	}

	/**
	 * Clearcoat roughness texture; linear multiplier. The `g` channel of this texture specifies
	 * roughness, independent of the base layer's roughness.
	 */
	public getClearcoatRoughnessTexture(): Texture | null {
		return this.getRef('clearcoatRoughnessTexture');
	}

	/**
	 * Settings affecting the material's use of its clearcoat roughness texture. If no texture is
	 * attached, {@link TextureInfo} is `null`.
	 */
	public getClearcoatRoughnessTextureInfo(): TextureInfo | null {
		return this.getRef('clearcoatRoughnessTexture') ? this.getRef('clearcoatRoughnessTextureInfo') : null;
	}

	/**
	 * Sets clearcoat roughness texture.
	 * See {@link Clearcoat.getClearcoatRoughnessTexture getClearcoatRoughnessTexture}.
	 */
	public setClearcoatRoughnessTexture(texture: Texture | null): this {
		return this.setRef('clearcoatRoughnessTexture', texture, { channels: G });
	}

	/**********************************************************************************************
	 * Clearcoat normals.
	 */

	/** Clearcoat normal scale. See {@link Clearcoat.getClearcoatNormalTexture getClearcoatNormalTexture}. */
	public getClearcoatNormalScale(): number {
		return this.get('clearcoatNormalScale');
	}

	/** Clearcoat normal scale. See {@link Clearcoat.getClearcoatNormalTexture getClearcoatNormalTexture}. */
	public setClearcoatNormalScale(scale: number): this {
		return this.set('clearcoatNormalScale', scale);
	}

	/**
	 * Clearcoat normal map. Independent of the material base layer normal map.
	 */
	public getClearcoatNormalTexture(): Texture | null {
		return this.getRef('clearcoatNormalTexture');
	}

	/**
	 * Settings affecting the material's use of its clearcoat normal texture. If no texture is
	 * attached, {@link TextureInfo} is `null`.
	 */
	public getClearcoatNormalTextureInfo(): TextureInfo | null {
		return this.getRef('clearcoatNormalTexture') ? this.getRef('clearcoatNormalTextureInfo') : null;
	}

	/** Sets clearcoat normal texture. See {@link Clearcoat.getClearcoatNormalTexture getClearcoatNormalTexture}. */
	public setClearcoatNormalTexture(texture: Texture | null): this {
		return this.setRef('clearcoatNormalTexture', texture, { channels: R | G | B });
	}
}
