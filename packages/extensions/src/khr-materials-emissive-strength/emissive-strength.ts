import { ExtensionProperty, IProperty, PropertyType } from '@gltf-transform/core';
import { KHR_MATERIALS_EMISSIVE_STRENGTH, Nullable } from '../constants';

interface IEmissiveStrength extends IProperty {
	emissiveStrength: number;
}

/**
 * # EmissiveStrength
 *
 * Defines emissive strength for a PBR {@link Material}, allowing high-dynamic-range
 * (HDR) emissive materials. See {@link MaterialsEmissiveStrength}.
 */
export class EmissiveStrength extends ExtensionProperty<IEmissiveStrength> {
	public readonly propertyType = 'EmissiveStrength';
	public readonly parentTypes = [PropertyType.MATERIAL];
	public readonly extensionName = KHR_MATERIALS_EMISSIVE_STRENGTH;
	public static EXTENSION_NAME = KHR_MATERIALS_EMISSIVE_STRENGTH;

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
