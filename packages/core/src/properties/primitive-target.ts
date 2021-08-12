import { PropertyType } from '../constants';
import { GraphChildList } from '../graph/index';
import { Accessor } from './accessor';
import { COPY_IDENTITY, Property } from './property';
import { AttributeLink } from './property-links';

/**
 * # PrimitiveTarget
 *
 * *Morph target or shape key used to deform one {@link Primitive} in a {@link Mesh}.*
 *
 * A PrimitiveTarget contains a `POSITION` attribute (and optionally `NORMAL` and `TANGENT`) that
 * can additively deform the base attributes on a {@link Mesh} {@link Primitive}. Vertex values
 * of `0, 0, 0` in the target will have no effect, whereas a value of `0, 1, 0` would offset that
 * vertex in the base geometry by y+=1. Morph targets can be fully or partially applied: their
 * default state is controlled by {@link Mesh.getWeights}, which can also be overridden for a
 * particular instantiation of a {@link Mesh}, using {@link Node.getWeights}.
 *
 * Reference:
 * - [glTF → Morph Targets](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#morph-targets)
 */
export class PrimitiveTarget extends Property {
	public readonly propertyType = PropertyType.PRIMITIVE_TARGET;

	/** @internal Vertex attributes. */
	@GraphChildList private attributes: AttributeLink[] = [];

	public copy(other: this, resolve = COPY_IDENTITY): this {
		super.copy(other, resolve);

		this.clearGraphChildList(this.attributes);
		other.listSemantics().forEach((semantic) => {
			this.setAttribute(semantic, resolve(other.getAttribute(semantic)!));
		});

		return this;
	}

	/** Returns a morph target vertex attribute as an {@link Accessor}. */
	public getAttribute(semantic: string): Accessor | null {
		const link = this.attributes.find((link) => link.semantic === semantic);
		return link ? link.getChild() : null;
	}

	/**
	 * Sets a morph target vertex attribute to an {@link Accessor}.
	 */
	public setAttribute(semantic: string, accessor: Accessor | null): this {
		// Remove previous attribute.
		const prevAccessor = this.getAttribute(semantic);
		if (prevAccessor) this.removeGraphChild(this.attributes, prevAccessor);

		// Stop if deleting the attribute.
		if (!accessor) return this;

		// Add next attribute.
		const link = this.graph.linkAttribute(semantic, this, accessor);
		link.semantic = semantic;
		return this.addGraphChild(this.attributes, link);
	}

	/**
	 * Lists all morph target vertex attribute {@link Accessor}s associated. Order will be
	 * consistent with the order returned by {@link .listSemantics}().
	 */
	public listAttributes(): Accessor[] {
		return this.attributes.map((link) => link.getChild());
	}

	/**
	 * Lists all morph target vertex attribute semantics associated. Order will be
	 * consistent with the order returned by {@link .listAttributes}().
	 */
	public listSemantics(): string[] {
		return this.attributes.map((link) => link.semantic);
	}
}
