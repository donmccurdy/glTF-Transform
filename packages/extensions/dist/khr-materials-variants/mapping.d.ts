import { ExtensionProperty, IProperty, Material, Nullable } from '@gltf-transform/core';
import { KHR_MATERIALS_VARIANTS } from '../constants';
import { Variant } from './variant';
interface IMapping extends IProperty {
    material: Material;
    variants: Variant[];
}
/**
 * # Mapping
 *
 * Maps {@link Variant}s to {@link Material}s. See {@link MaterialsVariants}.
 */
export declare class Mapping extends ExtensionProperty<IMapping> {
    static EXTENSION_NAME: string;
    extensionName: typeof KHR_MATERIALS_VARIANTS;
    propertyType: 'Mapping';
    parentTypes: ['MappingList'];
    protected init(): void;
    protected getDefaults(): Nullable<IMapping>;
    /** The {@link Material} designated for this {@link Primitive}, under the given variants. */
    getMaterial(): Material | null;
    /** The {@link Material} designated for this {@link Primitive}, under the given variants. */
    setMaterial(material: Material | null): this;
    /** Adds a {@link Variant} to this mapping. */
    addVariant(variant: Variant): this;
    /** Removes a {@link Variant} from this mapping. */
    removeVariant(variant: Variant): this;
    /** Lists {@link Variant}s in this mapping. */
    listVariants(): Variant[];
}
export {};
