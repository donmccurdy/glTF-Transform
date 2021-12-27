import { ExtensionProperty } from '@gltf-transform/core';
import { PropertyType } from '@gltf-transform/core';
import { KHR_MATERIALS_UNLIT } from '../constants';
/**
 * # Unlit
 *
 * Converts a PBR {@link Material} to an unlit shading model. See {@link MaterialsUnlit}.
 */
export declare class Unlit extends ExtensionProperty {
    static EXTENSION_NAME: string;
    extensionName: typeof KHR_MATERIALS_UNLIT;
    propertyType: 'Unlit';
    parentTypes: [PropertyType.MATERIAL];
    protected init(): void;
}
