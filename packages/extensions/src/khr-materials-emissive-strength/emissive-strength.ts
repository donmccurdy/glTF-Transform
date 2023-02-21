import { ExtensionProperty, IProperty, Nullable, PropertyType } from '@gltf-transform/core';
import { KHR_MATERIALS_EMISSIVE_STRENGTH } from '../constants.js';

interface IEmissiveStrength extends IProperty {
	emissiveStrength: number;
}

/**
 * # EmissiveStrength
 *
 * Defines emissive strength for a PBR {@link Material}, allowing high-dynamic-range
 * (HDR) emissive materials. See {@link KHRMaterialsEmissiveStrength}.
 */
export class EmissiveStrength extends ExtensionProperty<IEmissiveStrength> {
	public static EXTENSION_NAME = KHR_MATERIALS_EMISSIVE_STRENGTH;
	public declare extensionName: typeof KHR_MATERIALS_EMISSIVE_STRENGTH;
	public declare propertyType: 'EmissiveStrength';
	public declare parentTypes: [PropertyType.MATERIAL];

	protected init(): void {
		this.extensionName = KHR_MATERIALS_EMISSIVE_STRENGTH;
		this.propertyType = 'EmissiveStrength';
		this.parentTypes = [PropertyType.MATERIAL];
	}

	protected getDefaults(): Nullable<IEmissiveStrength> {
		return Object.assign(super.getDefaults() as IProperty, { emissiveStrength: 1.0 });
	}

	/**********************************************************************************************
	 * EmissiveStrength.
	 */

	/** EmissiveStrength. */
	public getEmissiveStrength(): number {
		return this.get('emissiveStrength');
	}

	/** EmissiveStrength. */
	public setEmissiveStrength(strength: number): this {
		return this.set('emissiveStrength', strength);
	}
}
