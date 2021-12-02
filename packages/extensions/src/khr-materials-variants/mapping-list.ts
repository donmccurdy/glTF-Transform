import { ExtensionProperty, IProperty, PropertyType } from '@gltf-transform/core';
import { KHR_MATERIALS_VARIANTS, Nullable } from '../constants';
import { Mapping } from './mapping';

interface IMappingList extends IProperty {
	mappings: Mapping[];
}

/**
 * # MappingList
 *
 * List of material variant {@link Mapping}s. See {@link MaterialsVariants}.
 */
export class MappingList extends ExtensionProperty<IMappingList> {
	public readonly propertyType = 'MappingList';
	public readonly parentTypes = [PropertyType.PRIMITIVE];
	public readonly extensionName = KHR_MATERIALS_VARIANTS;
	public static EXTENSION_NAME = KHR_MATERIALS_VARIANTS;

	protected getDefaultAttributes(): Nullable<IMappingList> {
		return Object.assign(super.getDefaultAttributes(), { mappings: [] });
	}

	/** Adds a {@link Mapping} to this mapping. */
	public addMapping(mapping: Mapping): this {
		return this.addRef('mappings', mapping);
	}

	/** Removes a {@link Mapping} from the list for this {@link Primitive}. */
	public removeMapping(mapping: Mapping): this {
		return this.removeRef('mappings', mapping);
	}

	/** Lists {@link Mapping}s in this {@link Primitive}. */
	public listMappings(): Mapping[] {
		return this.listRefs('mappings');
	}
}
