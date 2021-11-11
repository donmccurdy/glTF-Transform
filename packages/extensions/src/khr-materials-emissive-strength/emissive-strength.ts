import { COPY_IDENTITY, ExtensionProperty, PropertyType } from '@gltf-transform/core';
import { KHR_MATERIALS_EMISSIVE_STRENGTH } from '../constants';

/**
 * # EmissiveStrength
 *
 * Defines emissive strength a PBR {@link Material}. Unlike
 * {@link Material.setEmissiveFactor}, the emissive strength allows HDR values
 * outside of the [0, 1] range. See {@link MaterialsEmissiveStrength}.
 */
export class EmissiveStrength extends ExtensionProperty {
	public readonly propertyType = 'EmissiveStrength';
	public readonly parentTypes = [PropertyType.MATERIAL];
	public readonly extensionName = KHR_MATERIALS_EMISSIVE_STRENGTH;
	public static EXTENSION_NAME = KHR_MATERIALS_EMISSIVE_STRENGTH;

	private _emissiveStrength = 1.0;

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this._emissiveStrength = other._emissiveStrength;

		return this;
	}

	/**********************************************************************************************
	 * EmissiveStrength.
	 */

	/** EmissiveStrength. */
	public getEmissiveStrength(): number { return this._emissiveStrength; }

	/** EmissiveStrength. */
	public setEmissiveStrength(emissiveStrength: number): this {
		this._emissiveStrength = emissiveStrength;
		return this;
	}
}
