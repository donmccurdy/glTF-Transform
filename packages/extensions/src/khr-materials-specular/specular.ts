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
import { KHR_MATERIALS_SPECULAR } from '../constants.js';

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
 * Defines specular reflectivity on a PBR {@link Material}. See {@link KHRMaterialsSpecular}.
 */
export class Specular extends ExtensionProperty<ISpecular> {
	public static EXTENSION_NAME = KHR_MATERIALS_SPECULAR;
	public declare extensionName: typeof KHR_MATERIALS_SPECULAR;
	public declare propertyType: 'Specular';
	public declare parentTypes: [PropertyType.MATERIAL];

	protected init(): void {
		this.extensionName = KHR_MATERIALS_SPECULAR;
		this.propertyType = 'Specular';
		this.parentTypes = [PropertyType.MATERIAL];
	}

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

	/** Specular; linear multiplier. See {@link Specular.getSpecularTexture getSpecularTexture}. */
	public getSpecularFactor(): number {
		return this.get('specularFactor');
	}

	/** Specular; linear multiplier. See {@link Specular.getSpecularTexture getSpecularTexture}. */
	public setSpecularFactor(factor: number): this {
		return this.set('specularFactor', factor);
	}

	/** Specular color; Linear-sRGB components. See {@link Specular.getSpecularTexture getSpecularTexture}. */
	public getSpecularColorFactor(): vec3 {
		return this.get('specularColorFactor');
	}

	/** Specular color; Linear-sRGB components. See {@link Specular.getSpecularTexture getSpecularTexture}. */
	public setSpecularColorFactor(factor: vec3): this {
		return this.set('specularColorFactor', factor);
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

	/** Sets specular texture. See {@link Specular.getSpecularTexture getSpecularTexture}. */
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

	/** Sets specular color texture. See {@link Specular.getSpecularColorTexture getSpecularColorTexture}. */
	public setSpecularColorTexture(texture: Texture | null): this {
		return this.setRef('specularColorTexture', texture, { channels: R | G | B, isColor: true });
	}
}
