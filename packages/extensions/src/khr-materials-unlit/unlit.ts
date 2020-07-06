import { ExtensionProperty } from '@gltf-transform/core';
import { KHR_MATERIALS_UNLIT } from '../constants';

/** Documentation in {@link EXTENSIONS.md}. */
export class Unlit extends ExtensionProperty {
	public readonly propertyType = 'Unlit';
	public readonly extensionName = KHR_MATERIALS_UNLIT;
	public static EXTENSION_NAME = KHR_MATERIALS_UNLIT;
}
