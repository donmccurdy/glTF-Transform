import {
	ExtensionProperty,
	type IProperty,
	type Nullable,
	PropertyType,
	type Texture,
	TextureChannel,
	TextureInfo,
} from '@gltf-transform/core';
import { KHR_MATERIALS_IRIDESCENCE } from '../constants.js';

interface IIridescence extends IProperty {
	iridescenceFactor: number;
	iridescenceTexture: Texture;
	iridescenceTextureInfo: TextureInfo;
	iridescenceIOR: number;
	iridescenceThicknessMinimum: number;
	iridescenceThicknessMaximum: number;
	iridescenceThicknessTexture: Texture;
	iridescenceThicknessTextureInfo: TextureInfo;
}

const { R, G } = TextureChannel;

/**
 * Defines iridescence (thin film interference) on a PBR {@link Material}. See {@link KHRMaterialsIridescence}.
 */
export class Iridescence extends ExtensionProperty<IIridescence> {
	public static EXTENSION_NAME: typeof KHR_MATERIALS_IRIDESCENCE = KHR_MATERIALS_IRIDESCENCE;
	public declare extensionName: typeof KHR_MATERIALS_IRIDESCENCE;
	public declare propertyType: 'Iridescence';
	public declare parentTypes: [PropertyType.MATERIAL];

	protected init(): void {
		this.extensionName = KHR_MATERIALS_IRIDESCENCE;
		this.propertyType = 'Iridescence';
		this.parentTypes = [PropertyType.MATERIAL];
	}

	protected getDefaults(): Nullable<IIridescence> {
		return Object.assign(super.getDefaults() as IProperty, {
			iridescenceFactor: 0.0,
			iridescenceTexture: null,
			iridescenceTextureInfo: new TextureInfo(this.graph, 'iridescenceTextureInfo'),
			iridescenceIOR: 1.3,
			iridescenceThicknessMinimum: 100,
			iridescenceThicknessMaximum: 400,
			iridescenceThicknessTexture: null,
			iridescenceThicknessTextureInfo: new TextureInfo(this.graph, 'iridescenceThicknessTextureInfo'),
		});
	}

	/**********************************************************************************************
	 * Iridescence.
	 */

	/** Iridescence; linear multiplier. See {@link Iridescence.getIridescenceTexture getIridescenceTexture}. */
	public getIridescenceFactor(): number {
		return this.get('iridescenceFactor');
	}

	/** Iridescence; linear multiplier. See {@link Iridescence.getIridescenceTexture getIridescenceTexture}. */
	public setIridescenceFactor(factor: number): this {
		return this.set('iridescenceFactor', factor);
	}

	/**
	 * Iridescence intensity.
	 *
	 * Only the red (R) channel is used for iridescence intensity, but this texture may optionally
	 * be packed with additional data in the other channels.
	 */
	public getIridescenceTexture(): Texture | null {
		return this.getRef('iridescenceTexture');
	}

	/**
	 * Settings affecting the material's use of its iridescence texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getIridescenceTextureInfo(): TextureInfo | null {
		return this.getRef('iridescenceTexture') ? this.getRef('iridescenceTextureInfo') : null;
	}

	/** Iridescence intensity. See {@link Iridescence.getIridescenceTexture getIridescenceTexture}. */
	public setIridescenceTexture(texture: Texture | null): this {
		return this.setRef('iridescenceTexture', texture, { channels: R });
	}

	/**********************************************************************************************
	 * Iridescence IOR.
	 */

	/** Index of refraction of the dielectric thin-film layer. */
	public getIridescenceIOR(): number {
		return this.get('iridescenceIOR');
	}

	/** Index of refraction of the dielectric thin-film layer. */
	public setIridescenceIOR(ior: number): this {
		return this.set('iridescenceIOR', ior);
	}

	/**********************************************************************************************
	 * Iridescence thickness.
	 */

	/** Minimum thickness of the thin-film layer, in nanometers (nm). */
	public getIridescenceThicknessMinimum(): number {
		return this.get('iridescenceThicknessMinimum');
	}

	/** Minimum thickness of the thin-film layer, in nanometers (nm). */
	public setIridescenceThicknessMinimum(thickness: number): this {
		return this.set('iridescenceThicknessMinimum', thickness);
	}

	/** Maximum thickness of the thin-film layer, in nanometers (nm). */
	public getIridescenceThicknessMaximum(): number {
		return this.get('iridescenceThicknessMaximum');
	}

	/** Maximum thickness of the thin-film layer, in nanometers (nm). */
	public setIridescenceThicknessMaximum(thickness: number): this {
		return this.set('iridescenceThicknessMaximum', thickness);
	}

	/**
	 * The green channel of this texture defines the thickness of the
	 * thin-film layer by blending between the minimum and maximum thickness.
	 */
	public getIridescenceThicknessTexture(): Texture | null {
		return this.getRef('iridescenceThicknessTexture');
	}

	/**
	 * Settings affecting the material's use of its iridescence thickness texture.
	 * If no texture is attached, {@link TextureInfo} is `null`.
	 */
	public getIridescenceThicknessTextureInfo(): TextureInfo | null {
		return this.getRef('iridescenceThicknessTexture') ? this.getRef('iridescenceThicknessTextureInfo') : null;
	}

	/**
	 * Sets iridescence thickness texture.
	 * See {@link Iridescence.getIridescenceThicknessTexture getIridescenceThicknessTexture}.
	 */
	public setIridescenceThicknessTexture(texture: Texture | null): this {
		return this.setRef('iridescenceThicknessTexture', texture, { channels: G });
	}
}
