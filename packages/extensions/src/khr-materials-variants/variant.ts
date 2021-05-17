import { ExtensionProperty, PropertyType } from '@gltf-transform/core';
import { KHR_MATERIALS_VARIANTS } from '../constants';

/**
 * # Variant
 *
 * Defines a variant of a {@link Material}. See {@link MaterialsVariants}.
 */
export class Variant extends ExtensionProperty {
	public readonly propertyType = 'Variant';
	public readonly parentTypes = [PropertyType.ROOT, 'MappingList'];
	public readonly extensionName = KHR_MATERIALS_VARIANTS;
	public static EXTENSION_NAME = KHR_MATERIALS_VARIANTS;
}
