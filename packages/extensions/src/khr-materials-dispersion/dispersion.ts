import { ExtensionProperty, type IProperty, type Nullable, PropertyType } from '@gltf-transform/core';
import { KHR_MATERIALS_DISPERSION } from '../constants.js';

interface IDispersion extends IProperty {
	dispersion: number;
}

/**
 * Defines dispersion for a PBR {@link Material}. See {@link KHRMaterialsDispersion}.
 */
export class Dispersion extends ExtensionProperty<IDispersion> {
	public static EXTENSION_NAME: typeof KHR_MATERIALS_DISPERSION = KHR_MATERIALS_DISPERSION;
	public declare extensionName: typeof KHR_MATERIALS_DISPERSION;
	public declare propertyType: 'Dispersion';
	public declare parentTypes: [PropertyType.MATERIAL];

	protected init(): void {
		this.extensionName = KHR_MATERIALS_DISPERSION;
		this.propertyType = 'Dispersion';
		this.parentTypes = [PropertyType.MATERIAL];
	}

	protected getDefaults(): Nullable<IDispersion> {
		return Object.assign(super.getDefaults() as IProperty, { dispersion: 0 });
	}

	/**********************************************************************************************
	 * Dispersion.
	 */

	/** Dispersion. */
	public getDispersion(): number {
		return this.get('dispersion');
	}

	/** Dispersion. */
	public setDispersion(dispersion: number): this {
		return this.set('dispersion', dispersion);
	}
}
