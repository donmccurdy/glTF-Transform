import { ExtensionProperty, IProperty, PropertyType } from '@gltf-transform/core';
import { KHR_MATERIALS_IOR, Nullable } from '../constants';

interface IIOR extends IProperty {
	ior: number;
}

/**
 * # IOR
 *
 * Defines index of refraction for a PBR {@link Material}. See {@link MaterialsIOR}.
 */
export class IOR extends ExtensionProperty<IIOR> {
	public readonly propertyType = 'IOR';
	public readonly parentTypes = [PropertyType.MATERIAL];
	public readonly extensionName = KHR_MATERIALS_IOR;
	public static EXTENSION_NAME = KHR_MATERIALS_IOR;

	protected getDefaults(): Nullable<IIOR> {
		return Object.assign(super.getDefaults() as IProperty, { ior: 0 });
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
