import { ExtensionProperty, IProperty, Material, Nullable } from '@gltf-transform/core';
import { KHR_MATERIALS_VARIANTS } from '../constants.js';
import type { Variant } from './variant.js';

interface IMapping extends IProperty {
	material: Material;
	variants: Variant[];
}

/**
 * # Mapping
 *
 * Maps {@link Variant}s to {@link Material}s. See {@link KHRMaterialsVariants}.
 */
export class Mapping extends ExtensionProperty<IMapping> {
	public static EXTENSION_NAME = KHR_MATERIALS_VARIANTS;
	public declare extensionName: typeof KHR_MATERIALS_VARIANTS;
	public declare propertyType: 'Mapping';
	public declare parentTypes: ['MappingList'];

	protected init(): void {
		this.extensionName = KHR_MATERIALS_VARIANTS;
		this.propertyType = 'Mapping';
		this.parentTypes = ['MappingList'];
	}

	protected getDefaults(): Nullable<IMapping> {
		return Object.assign(super.getDefaults() as IProperty, { material: null, variants: [] });
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
