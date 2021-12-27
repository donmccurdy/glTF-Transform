import { ExtensionProperty } from '@gltf-transform/core';
import { KHR_MATERIALS_VARIANTS } from '../constants';
/**
 * # Variant
 *
 * Defines a variant of a {@link Material}. See {@link MaterialsVariants}.
 */
export declare class Variant extends ExtensionProperty {
    static EXTENSION_NAME: string;
    extensionName: typeof KHR_MATERIALS_VARIANTS;
    propertyType: 'Variant';
    parentTypes: ['MappingList'];
    protected init(): void;
}
