import { ExtensionProperty, IProperty, Nullable, PropertyType } from '@gltf-transform/core';
import { KHR_MATERIALS_VARIANTS } from '../constants.js';
import type { Mapping } from './mapping.js';

interface IMappingList extends IProperty {
	mappings: Mapping[];
}

/**
 * List of material variant {@link Mapping}s. See {@link KHRMaterialsVariants}.
 */
export class MappingList extends ExtensionProperty<IMappingList> {
	public static EXTENSION_NAME = KHR_MATERIALS_VARIANTS;
	public declare extensionName: typeof KHR_MATERIALS_VARIANTS;
	public declare propertyType: 'MappingList';
	public declare parentTypes: [PropertyType.PRIMITIVE];

	protected init(): void {
		this.extensionName = KHR_MATERIALS_VARIANTS;
		this.propertyType = 'MappingList';
		this.parentTypes = [PropertyType.PRIMITIVE];
	}

	protected getDefaults(): Nullable<IMappingList> {
		return Object.assign(super.getDefaults() as IProperty, { mappings: [] });
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
