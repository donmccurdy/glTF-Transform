import { Nullable, PropertyType } from '../constants';
import { Accessor } from './accessor';
import { COPY_IDENTITY, Property } from './property';

interface IPrimitiveTarget {
	attributes: { [key: string]: Accessor };
}

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
export class PrimitiveTarget extends Property<IPrimitiveTarget> {
	public readonly propertyType = PropertyType.PRIMITIVE_TARGET;

	protected getDefaultAttributes(): Nullable<IPrimitiveTarget> {
		return { attributes: {} };
	}

	/** Returns a morph target vertex attribute as an {@link Accessor}. */
	public getAttribute(semantic: string): Accessor | null {
		return this.getRefMap('attributes', semantic);
	}

	/**
	 * Sets a morph target vertex attribute to an {@link Accessor}.
	 */
	public setAttribute(semantic: string, accessor: Accessor | null): this {
		return this.setRefMap('attributes', semantic, accessor);
	}

	/**
	 * Lists all morph target vertex attribute {@link Accessor}s associated. Order will be
	 * consistent with the order returned by {@link .listSemantics}().
	 */
	public listAttributes(): Accessor[] {
		return this.listRefMapValues('attributes');
	}

	/**
	 * Lists all morph target vertex attribute semantics associated. Order will be
	 * consistent with the order returned by {@link .listAttributes}().
	 */
	public listSemantics(): string[] {
		return this.listRefMapKeys('attributes');
	}
}
