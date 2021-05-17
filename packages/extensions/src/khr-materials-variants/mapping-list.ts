import { COPY_IDENTITY, ExtensionProperty, GraphChildList, Link, PropertyType } from '@gltf-transform/core';
import { KHR_MATERIALS_VARIANTS } from '../constants';
import { Mapping } from './mapping';

/**
 * # MappingList
 *
 * List of material variant {@link Mapping}s. See {@link MaterialsVariants}.
 */
export class MappingList extends ExtensionProperty {
	public readonly propertyType = 'MappingList';
	public readonly parentTypes = [PropertyType.PRIMITIVE];
	public readonly extensionName = KHR_MATERIALS_VARIANTS;
	public static EXTENSION_NAME = KHR_MATERIALS_VARIANTS;

	@GraphChildList private mappings: Link<this, Mapping>[] = [];

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this.clearGraphChildList(this.mappings);
		other.mappings.forEach((link) => this.addMapping(resolve(link.getChild())));

		return this;
	}

	/** Adds a {@link Mapping} to this mapping. */
	public addMapping(mapping: Mapping): this {
		const link = this.graph.link('mapping', this, mapping);
		return this.addGraphChild(this.mappings, link);
	}

	/** Removes a {@link Mapping} from the list for this {@link Primitive}. */
	public removeMapping(mapping: Mapping): this {
		return this.removeGraphChild(this.mappings, mapping);
	}

	/** Lists {@link Mapping}s in this {@link Primitive}. */
	public listMappings(): Mapping[] {
		return this.mappings.map((link) => link.getChild());
	}
}
