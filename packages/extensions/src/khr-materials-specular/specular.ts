import {
	ColorUtils,
	ExtensionProperty,
	IProperty,
	PropertyType,
	Texture,
	TextureChannel,
	TextureInfo,
	vec3,
} from '@gltf-transform/core';
import { KHR_MATERIALS_SPECULAR, Nullable } from '../constants';

interface ISpecular extends IProperty {
	specularFactor: number;
	specularTexture: Texture;
	specularTextureInfo: TextureInfo;
	specularColorFactor: vec3;
	specularColorTexture: Texture;
	specularColorTextureInfo: TextureInfo;
}

const { R, G, B, A } = TextureChannel;

/**
 * # Specular
 *
 * Defines specular reflectivity on a PBR {@link Material}. See {@link MaterialsSpecular}.
 */
export class Specular extends ExtensionProperty<ISpecular> {
	public readonly propertyType = 'Specular';
	public readonly parentTypes = [PropertyType.MATERIAL];
	public readonly extensionName = KHR_MATERIALS_SPECULAR;
	public static EXTENSION_NAME = KHR_MATERIALS_SPECULAR;

	protected getDefaults(): Nullable<ISpecular> {
		return Object.assign(super.getDefaults() as IProperty, {
			specularFactor: 1.0,
			specularTexture: null,
			specularTextureInfo: new TextureInfo(this.graph, 'specularTextureInfo'),
			specularColorFactor: [1.0, 1.0, 1.0] as vec3,
			specularColorTexture: null,
			specularColorTextureInfo: new TextureInfo(this.graph, 'specularColorTextureInfo'),
		});
	}

	/**********************************************************************************************
	 * Specular.
	 */

	/** Specular; linear multiplier. See {@link getSpecularTexture}. */
	public getSpecularFactor(): number {
		return this.get('specularFactor');
	}

	/** Specular; linear multiplier. See {@link getSpecularTexture}. */
	public setSpecularFactor(factor: number): this {
		return this.set('specularFactor', factor);
	}

	/** Specular color; components in linear space. See {@link getSpecularTexture}. */
	public getSpecularColorFactor(): vec3 {
		return this.get('specularColorFactor');
	}

	/** Specular color; components in linear space. See {@link getSpecularTexture}. */
	public setSpecularColorFactor(factor: vec3): this {
		return this.set('specularColorFactor', factor);
	}

	/** Specular color; hexadecimal in sRGB colorspace. See {@link getSpecularTexture} */
	public getSpecularColorHex(): number {
		return ColorUtils.factorToHex(this.getSpecularColorFactor());
	}

	/** Specular color; hexadecimal in sRGB colorspace. See {@link getSpecularTexture} */
	public setSpecularColorHex(hex: number): this {
		const factor = this.getSpecularColorFactor().slice() as vec3;
		return this.set('specularColorFactor', ColorUtils.hexToFactor(hex, factor));
	}

	/**
	 * Specular texture; linear multiplier. Configures the strength of the specular reflection in
	 * the dielectric BRDF. A value of zero disables the specular reflection, resulting in a pure
	 * diffuse material.
	 *
	 * Only the alpha (A) channel is used for specular strength, but this texture may optionally
	 * be packed with specular color (RGB) into a single texture.
	 */
	public getSpecularTexture(): Texture | null {
		return this.getRef('specularTexture');
	}

	/**
	 * Settings affecting the material's use of its specular texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getSpecularTextureInfo(): TextureInfo | null {
		return this.getRef('specularTexture') ? this.getRef('specularTextureInfo') : null;
	}

	/** Sets specular texture. See {@link getSpecularTexture}. */
	public setSpecularTexture(texture: Texture | null): this {
		return this.setRef('specularTexture', texture, { channels: A });
	}

	/**
	 * Specular color texture; linear multiplier. Defines the F0 color of the specular reflection
	 * (RGB channels, encoded in sRGB) in the the dielectric BRDF.
	 *
	 * Only RGB channels are used here, but this texture may optionally be packed with a specular
	 * factor (A) into a single texture.
	 */
	public getSpecularColorTexture(): Texture | null {
		return this.getRef('specularColorTexture');
	}

	/**
	 * Settings affecting the material's use of its specular color texture. If no texture is
	 * attached, {@link TextureInfo} is `null`.
	 */
	public getSpecularColorTextureInfo(): TextureInfo | null {
		return this.getRef('specularColorTexture') ? this.getRef('specularColorTextureInfo') : null;
	}

	/** Sets specular color texture. See {@link getSpecularColorTexture}. */
	public setSpecularColorTexture(texture: Texture | null): this {
		return this.setRef('specularColorTexture', texture, { channels: R | G | B });
	}
}
