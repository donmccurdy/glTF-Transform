import { ExtensionProperty } from '@gltf-transform/core';
import { KHR_MATERIALS_VARIANTS } from '../constants.js';

/**
 * Defines a variant of a {@link Material}. See {@link KHRMaterialsVariants}.
 */
export class Variant extends ExtensionProperty {
	public static EXTENSION_NAME: typeof KHR_MATERIALS_VARIANTS = KHR_MATERIALS_VARIANTS;
	public declare extensionName: typeof KHR_MATERIALS_VARIANTS;
	public declare propertyType: 'Variant';
	public declare parentTypes: ['MappingList'];

	protected init(): void {
		this.extensionName = KHR_MATERIALS_VARIANTS;
		this.propertyType = 'Variant';
		this.parentTypes = ['MappingList'];
	}
}
