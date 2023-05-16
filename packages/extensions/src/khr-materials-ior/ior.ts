import { ExtensionProperty, IProperty, Nullable, PropertyType } from '@gltf-transform/core';
import { KHR_MATERIALS_IOR } from '../constants.js';

interface IIOR extends IProperty {
	ior: number;
}

/**
 * Defines index of refraction for a PBR {@link Material}. See {@link KHRMaterialsIOR}.
 */
export class IOR extends ExtensionProperty<IIOR> {
	public static EXTENSION_NAME = KHR_MATERIALS_IOR;
	public declare extensionName: typeof KHR_MATERIALS_IOR;
	public declare propertyType: 'IOR';
	public declare parentTypes: [PropertyType.MATERIAL];

	protected init(): void {
		this.extensionName = KHR_MATERIALS_IOR;
		this.propertyType = 'IOR';
		this.parentTypes = [PropertyType.MATERIAL];
	}

	protected getDefaults(): Nullable<IIOR> {
		return Object.assign(super.getDefaults() as IProperty, { ior: 1.5 });
	}

	/**********************************************************************************************
	 * IOR.
	 */

	/** IOR. */
	public getIOR(): number {
		return this.get('ior');
	}

	/** IOR. */
	public setIOR(ior: number): this {
		return this.set('ior', ior);
	}
}
