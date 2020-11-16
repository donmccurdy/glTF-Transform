import { ExtensionProperty, GraphChild, GraphChildList, Link, Material } from '@gltf-transform/core';
import { KHR_MATERIALS_VARIANTS } from '../constants';
import { Variant } from './variant';

/** Documentation in {@link EXTENSIONS.md}. */
export class Mapping extends ExtensionProperty {
	public readonly propertyType = 'Mapping';
	public readonly parentTypes = ['MappingList'];
	public readonly extensionName = KHR_MATERIALS_VARIANTS;
	public static EXTENSION_NAME = KHR_MATERIALS_VARIANTS;

	@GraphChild private material: Link<this, Material> = null;
	@GraphChildList private variants: Link<this, Variant>[] = [];

	/** The {@link Material} designated for this {@link Primitive}, under the given variants. */
	public getMaterial(): Material { return this.material ? this.material.getChild() : null; }

	/** The {@link Material} designated for this {@link Primitive}, under the given variants. */
	public setMaterial(material: Material): this {
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
