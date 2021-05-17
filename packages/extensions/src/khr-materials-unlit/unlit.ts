import { ExtensionProperty } from '@gltf-transform/core';
import { PropertyType } from '@gltf-transform/core';
import { KHR_MATERIALS_UNLIT } from '../constants';

/**
 * # Unlit
 *
 * Converts a PBR {@link Material} to an unlit shading model. See {@link MaterialsUnlit}.
 */
export class Unlit extends ExtensionProperty {
	public readonly propertyType = 'Unlit';
	public readonly parentTypes = [PropertyType.MATERIAL];
	public readonly extensionName = KHR_MATERIALS_UNLIT;
	public static EXTENSION_NAME = KHR_MATERIALS_UNLIT;
}
