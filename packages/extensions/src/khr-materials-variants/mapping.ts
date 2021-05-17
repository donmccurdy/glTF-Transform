import { COPY_IDENTITY, ExtensionProperty, GraphChild, GraphChildList, Link, Material } from '@gltf-transform/core';
import { KHR_MATERIALS_VARIANTS } from '../constants';
import { Variant } from './variant';

/**
 * # Mapping
 *
 * Maps {@link Variant}s to {@link Material}s. See {@link MaterialsVariants}.
 */
export class Mapping extends ExtensionProperty {
	public readonly propertyType = 'Mapping';
	public readonly parentTypes = ['MappingList'];
	public readonly extensionName = KHR_MATERIALS_VARIANTS;
	public static EXTENSION_NAME = KHR_MATERIALS_VARIANTS;

	@GraphChild private material: Link<this, Material> | null = null;
	@GraphChildList private variants: Link<this, Variant>[] = [];

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this.setMaterial(other.material ? resolve(other.material.getChild()) : null);

		this.clearGraphChildList(this.variants);
		other.variants.forEach((link) => this.addVariant(resolve(link.getChild())));

		return this;
	}

	/** The {@link Material} designated for this {@link Primitive}, under the given variants. */
	public getMaterial(): Material | null {
		return this.material ? this.material.getChild() : null;
	}

	/** The {@link Material} designated for this {@link Primitive}, under the given variants. */
	public setMaterial(material: Material | null): this {
		this.material = this.graph.link('material', this, material);
		return this;
	}

	/** Adds a {@link Variant} to this mapping. */
	public addVariant(variant: Variant): this {
		const link = this.graph.link('variant', this, variant);
		return this.addGraphChild(this.variants, link);
	}

	/** Removes a {@link Variant} from this mapping. */
	public removeVariant(variant: Variant): this {
		return this.removeGraphChild(this.variants, variant);
	}

	/** Lists {@link Variant}s in this mapping. */
	public listVariants(): Variant[] {
		return this.variants.map((link) => link.getChild());
	}
}
