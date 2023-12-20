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
import { KHR_MATERIALS_VOLUME } from '../constants.js';

interface IVolume extends IProperty {
	thicknessFactor: number;
	thicknessTexture: Texture;
	thicknessTextureInfo: TextureInfo;
	attenuationDistance: number;
	attenuationColor: vec3;
}

const { G } = TextureChannel;

/**
 * Defines volume on a PBR {@link Material}. See {@link KHRMaterialsVolume}.
 */
export class Volume extends ExtensionProperty<IVolume> {
	public static EXTENSION_NAME = KHR_MATERIALS_VOLUME;
	public declare extensionName: typeof KHR_MATERIALS_VOLUME;
	public declare propertyType: 'Volume';
	public declare parentTypes: [PropertyType.MATERIAL];

	protected init(): void {
		this.extensionName = KHR_MATERIALS_VOLUME;
		this.propertyType = 'Volume';
		this.parentTypes = [PropertyType.MATERIAL];
	}

	protected getDefaults(): Nullable<IVolume> {
		return Object.assign(super.getDefaults() as IProperty, {
			thicknessFactor: 0.0,
			thicknessTexture: null,
			thicknessTextureInfo: new TextureInfo(this.graph, 'thicknessTexture'),
			attenuationDistance: Infinity,
			attenuationColor: [1.0, 1.0, 1.0] as vec3,
		});
	}

	/**********************************************************************************************
	 * Thickness.
	 */

	/**
	 * Thickness of the volume beneath the surface in meters in the local coordinate system of the
	 * node. If the value is 0 the material is thin-walled. Otherwise the material is a volume
	 * boundary. The doubleSided property has no effect on volume boundaries.
	 */
	public getThicknessFactor(): number {
		return this.get('thicknessFactor');
	}

	/**
	 * Thickness of the volume beneath the surface in meters in the local coordinate system of the
	 * node. If the value is 0 the material is thin-walled. Otherwise the material is a volume
	 * boundary. The doubleSided property has no effect on volume boundaries.
	 */
	public setThicknessFactor(factor: number): this {
		return this.set('thicknessFactor', factor);
	}

	/**
	 * Texture that defines the thickness, stored in the G channel. This will be multiplied by
	 * thicknessFactor.
	 */
	public getThicknessTexture(): Texture | null {
		return this.getRef('thicknessTexture');
	}

	/**
	 * Settings affecting the material's use of its thickness texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getThicknessTextureInfo(): TextureInfo | null {
		return this.getRef('thicknessTexture') ? this.getRef('thicknessTextureInfo') : null;
	}

	/**
	 * Texture that defines the thickness, stored in the G channel. This will be multiplied by
	 * thicknessFactor.
	 */
	public setThicknessTexture(texture: Texture | null): this {
		return this.setRef('thicknessTexture', texture, { channels: G });
	}

	/**********************************************************************************************
	 * Attenuation.
	 */

	/**
	 * Density of the medium given as the average distance in meters that light travels in the
	 * medium before interacting with a particle.
	 */
	public getAttenuationDistance(): number {
		return this.get('attenuationDistance');
	}

	/**
	 * Density of the medium given as the average distance in meters that light travels in the
	 * medium before interacting with a particle.
	 */
	public setAttenuationDistance(distance: number): this {
		return this.set('attenuationDistance', distance);
	}

	/**
	 * Color (linear) that white light turns into due to absorption when reaching the attenuation
	 * distance.
	 */
	public getAttenuationColor(): vec3 {
		return this.get('attenuationColor');
	}

	/**
	 * Color (linear) that white light turns into due to absorption when reaching the attenuation
	 * distance.
	 */
	public setAttenuationColor(color: vec3): this {
		return this.set('attenuationColor', color);
	}
}
