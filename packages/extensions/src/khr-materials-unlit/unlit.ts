import { ExtensionProperty } from '@gltf-transform/core';
import { PropertyType } from '@gltf-transform/core';
import { KHR_MATERIALS_UNLIT } from '../constants';

/**
 * # Unlit
 *
 * Converts a PBR {@link Material} to an unlit shading model. See {@link MaterialsUnlit}.
 */
export class Unlit extends ExtensionProperty {
	public static EXTENSION_NAME = KHR_MATERIALS_UNLIT;
	public declare extensionName: typeof KHR_MATERIALS_UNLIT;
	public declare propertyType: 'Unlit';
	public declare parentTypes: [PropertyType.MATERIAL];

	protected init(): this {
		this.extensionName = KHR_MATERIALS_UNLIT;
		this.propertyType = 'Unlit';
		this.parentTypes = [PropertyType.MATERIAL];
		return this;
	}
}
