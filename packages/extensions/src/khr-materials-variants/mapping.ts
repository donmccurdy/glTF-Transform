import { ExtensionProperty, IProperty, Material } from '@gltf-transform/core';
import { KHR_MATERIALS_VARIANTS, Nullable } from '../constants';
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
export class Mapping extends ExtensionProperty<IMapping> {
	public readonly propertyType = 'Mapping';
	public readonly parentTypes = ['MappingList'];
	public readonly extensionName = KHR_MATERIALS_VARIANTS;
	public static EXTENSION_NAME = KHR_MATERIALS_VARIANTS;

	protected getDefaultAttributes(): Nullable<IMapping> {
		// TODO(cleanup): Can we get this type-checked?
		return Object.assign(super.getDefaultAttributes(), { material: null, variants: [] });
	}

	/** The {@link Material} designated for this {@link Primitive}, under the given variants. */
	public getMaterial(): Material | null {
		return this.getRef('material');
	}

	/** The {@link Material} designated for this {@link Primitive}, under the given variants. */
	public setMaterial(material: Material | null): this {
		return this.setRef('material', material);
	}

	/** Adds a {@link Variant} to this mapping. */
	public addVariant(variant: Variant): this {
		return this.addRef('variants', variant);
	}

	/** Removes a {@link Variant} from this mapping. */
	public removeVariant(variant: Variant): this {
		return this.removeRef('variants', variant);
	}

	/** Lists {@link Variant}s in this mapping. */
	public listVariants(): Variant[] {
		return this.listRefs('variants');
	}
}
