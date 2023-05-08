import {
	ExtensionProperty,
	IProperty,
	Nullable,
	PropertyType,
	Texture,
	TextureChannel,
	TextureInfo,
} from '@gltf-transform/core';
import { KHR_MATERIALS_TRANSMISSION } from '../constants.js';

interface ITransmission extends IProperty {
	transmissionFactor: number;
	transmissionTexture: Texture;
	transmissionTextureInfo: TextureInfo;
}

const { R } = TextureChannel;

/**
 * Defines optical transmission on a PBR {@link Material}. See {@link KHRMaterialsTransmission}.
 */
export class Transmission extends ExtensionProperty<ITransmission> {
	public static EXTENSION_NAME = KHR_MATERIALS_TRANSMISSION;
	public declare extensionName: typeof KHR_MATERIALS_TRANSMISSION;
	public declare propertyType: 'Transmission';
	public declare parentTypes: [PropertyType.MATERIAL];

	protected init(): void {
		this.extensionName = KHR_MATERIALS_TRANSMISSION;
		this.propertyType = 'Transmission';
		this.parentTypes = [PropertyType.MATERIAL];
	}

	protected getDefaults(): Nullable<ITransmission> {
		return Object.assign(super.getDefaults() as IProperty, {
			transmissionFactor: 0.0,
			transmissionTexture: null,
			transmissionTextureInfo: new TextureInfo(this.graph, 'transmissionTextureInfo'),
		});
	}

	/**********************************************************************************************
	 * Transmission.
	 */

	/** Transmission; linear multiplier. See {@link Transmission.getTransmissionTexture getTransmissionTexture}. */
	public getTransmissionFactor(): number {
		return this.get('transmissionFactor');
	}

	/** Transmission; linear multiplier. See {@link Transmission.getTransmissionTexture getTransmissionTexture}. */
	public setTransmissionFactor(factor: number): this {
		return this.set('transmissionFactor', factor);
	}

	/**
	 * Transmission texture; linear multiplier. The `r` channel of this texture specifies
	 * transmission [0-1] of the material's surface. By default this is a thin transparency
	 * effect, but volume effects (refraction, subsurface scattering) may be introduced with the
	 * addition of the `KHR_materials_volume` extension.
	 */
	public getTransmissionTexture(): Texture | null {
		return this.getRef('transmissionTexture');
	}

	/**
	 * Settings affecting the material's use of its transmission texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getTransmissionTextureInfo(): TextureInfo | null {
		return this.getRef('transmissionTexture') ? this.getRef('transmissionTextureInfo') : null;
	}

	/** Sets transmission texture. See {@link Transmission.getTransmissionTexture getTransmissionTexture}. */
	public setTransmissionTexture(texture: Texture | null): this {
		return this.setRef('transmissionTexture', texture, { channels: R });
	}
}
