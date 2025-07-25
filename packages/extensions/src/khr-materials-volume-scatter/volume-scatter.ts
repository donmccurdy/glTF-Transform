import { ExtensionProperty, type IProperty, type Nullable, PropertyType, type vec3 } from '@gltf-transform/core';
import { KHR_MATERIALS_VOLUME_SCATTER } from '../constants.js';

interface IVolumeScatter extends IProperty {
	multiscatterColor: vec3;
	scatterAnisotropy: number;
}

/**
 * Defines dense subsurface scattering on a volumetric PBR {@link Material}. See
 * {@link KHRMaterialsVolumeScatter}.
 */
export class VolumeScatter extends ExtensionProperty<IVolumeScatter> {
	public static EXTENSION_NAME: typeof KHR_MATERIALS_VOLUME_SCATTER = KHR_MATERIALS_VOLUME_SCATTER;
	public declare extensionName: typeof KHR_MATERIALS_VOLUME_SCATTER;
	public declare propertyType: 'VolumeScatter';
	public declare parentTypes: [PropertyType.MATERIAL];

	protected init(): void {
		this.extensionName = KHR_MATERIALS_VOLUME_SCATTER;
		this.propertyType = 'VolumeScatter';
		this.parentTypes = [PropertyType.MATERIAL];
	}

	protected getDefaults(): Nullable<IVolumeScatter> {
		return Object.assign(super.getDefaults() as IProperty, {
			multiscatterColor: [0.0, 0.0, 0.0] as vec3,
			scatterAnisotropy: 0.0,
		});
	}

	/**********************************************************************************************
	 * Multiscatter color.
	 */

	/**
	 * Multi-scatter albedo. Light scatters multiple times in a medium before leaving the volume.
	 * Depending on the number of bounces, the overall perceived color of the medium may differ
	 * drastically from the single-scatter albedo.
	 */
	public getMultiscatterColor(): vec3 {
		return this.get('multiscatterColor');
	}

	/**
	 * Multi-scatter albedo. Light scatters multiple times in a medium before leaving the volume.
	 * Depending on the number of bounces, the overall perceived color of the medium may differ
	 * drastically from the single-scatter albedo.
	 */
	public setMultiscatterColor(color: vec3): this {
		return this.set('multiscatterColor', color);
	}

	/**********************************************************************************************
	 * Scatter anisotropy.
	 */

	/**
	 * Anisotropy of scatter events. Range is (-1, 1).
	 */
	public getScatterAnisotropy(): number {
		return this.get('scatterAnisotropy');
	}

	/**
	 * Anisotropy of scatter events. Range is (-1, 1).
	 */
	public setScatterAnisotropy(scatterAnisotropy: number): this {
		return this.set('scatterAnisotropy', scatterAnisotropy);
	}
}
