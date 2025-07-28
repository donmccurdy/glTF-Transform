import { ExtensionProperty, PropertyType } from '@gltf-transform/core';
import { KHR_MATERIALS_UNLIT } from '../constants.js';

/**
 * Converts a PBR {@link Material} to an unlit shading model. See {@link KHRMaterialsUnlit}.
 */
export class Unlit extends ExtensionProperty {
	public static EXTENSION_NAME: typeof KHR_MATERIALS_UNLIT = KHR_MATERIALS_UNLIT;
	public declare extensionName: typeof KHR_MATERIALS_UNLIT;
	public declare propertyType: 'Unlit';
	public declare parentTypes: [PropertyType.MATERIAL];

	protected init(): void {
		this.extensionName = KHR_MATERIALS_UNLIT;
		this.propertyType = 'Unlit';
		this.parentTypes = [PropertyType.MATERIAL];
	}
}
