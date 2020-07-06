import { ExtensionProperty } from '@gltf-transform/core';
import { PropertyType } from '@gltf-transform/core';
import { KHR_TEXTURE_BASISU } from '../constants';

/** Documentation in {@link EXTENSIONS.md}. */
export class Basisu extends ExtensionProperty {
	public readonly propertyType = 'Basisu';
	public readonly parentTypes = [PropertyType.TEXTURE];
	public readonly extensionName = KHR_TEXTURE_BASISU;
	public static EXTENSION_NAME = KHR_TEXTURE_BASISU;
}
