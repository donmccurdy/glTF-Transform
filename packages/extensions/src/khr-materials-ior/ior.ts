import { COPY_IDENTITY, ExtensionProperty, PropertyType } from '@gltf-transform/core';
import { KHR_MATERIALS_IOR } from '../constants';

/**
 * # IOR
 *
 * Defines index of refraction for a PBR {@link Material}. See {@link MaterialsIOR}.
 */
export class IOR extends ExtensionProperty {
	public readonly propertyType = 'IOR';
	public readonly parentTypes = [PropertyType.MATERIAL];
	public readonly extensionName = KHR_MATERIALS_IOR;
	public static EXTENSION_NAME = KHR_MATERIALS_IOR;

	private _ior = 0.0;

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this._ior = other._ior;

		return this;
	}

	/**********************************************************************************************
	 * IOR.
	 */

	/** IOR. */
	public getIOR(): number { return this._ior; }

	/** IOR. */
	public setIOR(ior: number): this {
		this._ior = ior;
		return this;
	}
}
