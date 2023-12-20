import {
	ExtensionProperty,
	IProperty,
	Nullable,
	PropertyType,
	Texture,
	TextureChannel,
	TextureInfo,
	vec3,
} from '@gltf-transform/core';
import { KHR_MATERIALS_SHEEN } from '../constants.js';

interface ISheen extends IProperty {
	sheenColorFactor: vec3;
	sheenColorTexture: Texture;
	sheenColorTextureInfo: TextureInfo;
	sheenRoughnessFactor: number;
	sheenRoughnessTexture: Texture;
	sheenRoughnessTextureInfo: TextureInfo;
}

const { R, G, B, A } = TextureChannel;

/**
 * Defines sheen on a PBR {@link Material}. See {@link KHRMaterialsSheen}.
 */
export class Sheen extends ExtensionProperty<ISheen> {
	public static EXTENSION_NAME = KHR_MATERIALS_SHEEN;
	public declare extensionName: typeof KHR_MATERIALS_SHEEN;
	public declare propertyType: 'Sheen';
	public declare parentTypes: [PropertyType.MATERIAL];

	protected init(): void {
		this.extensionName = KHR_MATERIALS_SHEEN;
		this.propertyType = 'Sheen';
		this.parentTypes = [PropertyType.MATERIAL];
	}

	protected getDefaults(): Nullable<ISheen> {
		return Object.assign(super.getDefaults() as IProperty, {
			sheenColorFactor: [0.0, 0.0, 0.0] as vec3,
			sheenColorTexture: null,
			sheenColorTextureInfo: new TextureInfo(this.graph, 'sheenColorTextureInfo'),
			sheenRoughnessFactor: 0.0,
			sheenRoughnessTexture: null,
			sheenRoughnessTextureInfo: new TextureInfo(this.graph, 'sheenRoughnessTextureInfo'),
		});
	}

	/**********************************************************************************************
	 * Sheen color.
	 */

	/** Sheen; linear multiplier. */
	public getSheenColorFactor(): vec3 {
		return this.get('sheenColorFactor');
	}

	/** Sheen; linear multiplier. */
	public setSheenColorFactor(factor: vec3): this {
		return this.set('sheenColorFactor', factor);
	}

	/**
	 * Sheen color texture, in sRGB colorspace.
	 */
	public getSheenColorTexture(): Texture | null {
		return this.getRef('sheenColorTexture');
	}

	/**
	 * Settings affecting the material's use of its sheen color texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getSheenColorTextureInfo(): TextureInfo | null {
		return this.getRef('sheenColorTexture') ? this.getRef('sheenColorTextureInfo') : null;
	}

	/** Sets sheen color texture. See {@link Sheen.getSheenColorTexture getSheenColorTexture}. */
	public setSheenColorTexture(texture: Texture | null): this {
		return this.setRef('sheenColorTexture', texture, { channels: R | G | B, isColor: true });
	}

	/**********************************************************************************************
	 * Sheen roughness.
	 */

	/** Sheen roughness; linear multiplier. See {@link Sheen.getSheenRoughnessTexture getSheenRoughnessTexture}. */
	public getSheenRoughnessFactor(): number {
		return this.get('sheenRoughnessFactor');
	}

	/** Sheen roughness; linear multiplier. See {@link Sheen.getSheenRoughnessTexture getSheenRoughnessTexture}. */
	public setSheenRoughnessFactor(factor: number): this {
		return this.set('sheenRoughnessFactor', factor);
	}

	/**
	 * Sheen roughness texture; linear multiplier. The `a` channel of this texture specifies
	 * roughness, independent of the base layer's roughness.
	 */
	public getSheenRoughnessTexture(): Texture | null {
		return this.getRef('sheenRoughnessTexture');
	}

	/**
	 * Settings affecting the material's use of its sheen roughness texture. If no texture is
	 * attached, {@link TextureInfo} is `null`.
	 */
	public getSheenRoughnessTextureInfo(): TextureInfo | null {
		return this.getRef('sheenRoughnessTexture') ? this.getRef('sheenRoughnessTextureInfo') : null;
	}

	/**
	 * Sets sheen roughness texture.  The `a` channel of this texture specifies
	 * roughness, independent of the base layer's roughness.
	 */
	public setSheenRoughnessTexture(texture: Texture | null): this {
		return this.setRef('sheenRoughnessTexture', texture, { channels: A });
	}
}
