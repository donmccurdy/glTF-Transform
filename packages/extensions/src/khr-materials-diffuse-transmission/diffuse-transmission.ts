import {
	ExtensionProperty,
	type IProperty,
	type Nullable,
	PropertyType,
	type Texture,
	TextureChannel,
	TextureInfo,
	type vec3,
} from '@gltf-transform/core';
import { KHR_MATERIALS_DIFFUSE_TRANSMISSION } from '../constants.js';

interface IDiffuseTransmission extends IProperty {
	diffuseTransmissionFactor: number;
	diffuseTransmissionTexture: Texture;
	diffuseTransmissionTextureInfo: TextureInfo;
	diffuseTransmissionColorFactor: vec3;
	diffuseTransmissionColorTexture: Texture;
	diffuseTransmissionColorTextureInfo: TextureInfo;
}

const { R, G, B, A } = TextureChannel;

/**
 * Defines diffuse transmission on a PBR {@link Material}. See {@link KHRMaterialsDiffuseTransmission}.
 *
 * @experimental KHR_materials_diffuse_transmission is not yet ratified by the Khronos Group.
 */
export class DiffuseTransmission extends ExtensionProperty<IDiffuseTransmission> {
	public static EXTENSION_NAME: typeof KHR_MATERIALS_DIFFUSE_TRANSMISSION = KHR_MATERIALS_DIFFUSE_TRANSMISSION;
	public declare extensionName: typeof KHR_MATERIALS_DIFFUSE_TRANSMISSION;
	public declare propertyType: 'DiffuseTransmission';
	public declare parentTypes: [PropertyType.MATERIAL];

	protected init(): void {
		this.extensionName = KHR_MATERIALS_DIFFUSE_TRANSMISSION;
		this.propertyType = 'DiffuseTransmission';
		this.parentTypes = [PropertyType.MATERIAL];
	}

	protected getDefaults(): Nullable<IDiffuseTransmission> {
		return Object.assign(super.getDefaults() as IProperty, {
			diffuseTransmissionFactor: 0.0,
			diffuseTransmissionTexture: null,
			diffuseTransmissionTextureInfo: new TextureInfo(this.graph, 'diffuseTransmissionTextureInfo'),
			diffuseTransmissionColorFactor: [1.0, 1.0, 1.0] as vec3,
			diffuseTransmissionColorTexture: null,
			diffuseTransmissionColorTextureInfo: new TextureInfo(this.graph, 'diffuseTransmissionColorTextureInfo'),
		});
	}

	/**********************************************************************************************
	 * Diffuse transmission.
	 */

	/**
	 * Percentage of reflected, non-specularly reflected light that is transmitted through the
	 * surface via the Lambertian diffuse transmission, i.e., the strength of the diffuse
	 * transmission effect.
	 */
	public getDiffuseTransmissionFactor(): number {
		return this.get('diffuseTransmissionFactor');
	}

	/**
	 * Percentage of reflected, non-specularly reflected light that is transmitted through the
	 * surface via the Lambertian diffuse transmission, i.e., the strength of the diffuse
	 * transmission effect.
	 */
	public setDiffuseTransmissionFactor(factor: number): this {
		return this.set('diffuseTransmissionFactor', factor);
	}

	/**
	 * Texture that defines the strength of the diffuse transmission effect, stored in the alpha (A)
	 * channel. Will be multiplied by the diffuseTransmissionFactor.
	 */
	public getDiffuseTransmissionTexture(): Texture | null {
		return this.getRef('diffuseTransmissionTexture');
	}

	/**
	 * Settings affecting the material's use of its diffuse transmission texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getDiffuseTransmissionTextureInfo(): TextureInfo | null {
		return this.getRef('diffuseTransmissionTexture') ? this.getRef('diffuseTransmissionTextureInfo') : null;
	}

	/**
	 * Texture that defines the strength of the diffuse transmission effect, stored in the alpha (A)
	 * channel. Will be multiplied by the diffuseTransmissionFactor.
	 */
	public setDiffuseTransmissionTexture(texture: Texture | null): this {
		return this.setRef('diffuseTransmissionTexture', texture, { channels: A });
	}

	/**********************************************************************************************
	 * Diffuse transmission color.
	 */

	/** Color of the transmitted light; Linear-sRGB components. */
	public getDiffuseTransmissionColorFactor(): vec3 {
		return this.get('diffuseTransmissionColorFactor');
	}

	/** Color of the transmitted light; Linear-sRGB components. */
	public setDiffuseTransmissionColorFactor(factor: vec3): this {
		return this.set('diffuseTransmissionColorFactor', factor);
	}

	/**
	 * Texture that defines the color of the transmitted light, stored in the RGB channels and
	 * encoded in sRGB. This texture will be multiplied by diffuseTransmissionColorFactor.
	 */
	public getDiffuseTransmissionColorTexture(): Texture | null {
		return this.getRef('diffuseTransmissionColorTexture');
	}

	/**
	 * Settings affecting the material's use of its diffuse transmission color texture. If no
	 * texture is attached, {@link TextureInfo} is `null`.
	 */
	public getDiffuseTransmissionColorTextureInfo(): TextureInfo | null {
		return this.getRef('diffuseTransmissionColorTexture')
			? this.getRef('diffuseTransmissionColorTextureInfo')
			: null;
	}

	/**
	 * Texture that defines the color of the transmitted light, stored in the RGB channels and
	 * encoded in sRGB. This texture will be multiplied by diffuseTransmissionColorFactor.
	 */
	public setDiffuseTransmissionColorTexture(texture: Texture | null): this {
		return this.setRef('diffuseTransmissionColorTexture', texture, { channels: R | G | B });
	}
}
