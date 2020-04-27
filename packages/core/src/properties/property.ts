import { NotImplementedError } from '../constants';
import { GraphNode } from '../graph';
import { PropertyGraph } from './property-graph';

/**
 * Properties represent distinct resources in a glTF asset, referenced by other properties.
 *
 * For example, each material and texture is a property, with material properties holding
 * references to the textures. All properties are created with factory methods on the
 * {@link Container} in which they should be constructed. Properties are destroyed by calling
 * {@link dispose}().
 *
 * Usage:
 *
 * ```ts
 * const texture = container.createTexture('myTexture');
 * container.listTextures(); // → [texture x 1]
 *
 * material.setBaseColorTexture(texture);
 * material.getBaseColortexture(); // → texture
 *
 * texture.detach();
 * material.getBaseColortexture(); // → null
 * container.listTextures(); // → [texture x 1]
 *
 * texture.dispose();
 * container.listTextures(); // → []
 * ```
 *
 * Reference:
 * - [glTF → Concepts](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#concepts)
 *
 * @category Properties
 */
export abstract class Property extends GraphNode {
	protected readonly graph: PropertyGraph;
	protected name = '';

	// TODO(feat): Extras should be Properties.
	protected extras: object = {};

	// TODO(feat): Extensions should be Properties.
	protected extensions: object = {};

	/** @hidden */
	constructor(graph: PropertyGraph, name = '') {
		super(graph);
		this.name = name;
	}

	/**
	 * Returns the name of this property. While names are not required to be unique, this is
	 * encouraged, and non-unique names will be overwritten in some tools. For custom data about
	 * a property, prefer to use Extras.
	 */
	public getName(): string { return this.name; }

	/**
	 * Sets the name of this property. While names are not required to be unique, this is
	 * encouraged, and non-unique names will be overwritten in some tools. For custom data about
	 * a property, prefer to use Extras.
	 */
	public setName(name: string): Property {
		this.name = name;
		return this;
	}

	/** @hidden */
	public getExtras(): object { return this.extras; }

	/** @hidden */
	public setExtras(extras: object): Property {
		this.extras = extras;
		return this;
	}

	/** @hidden */
	public getExtensions(): object { return this.extensions; }

	/** @hidden */
	public setExtensions(extensions: object): Property {
		this.extensions = extensions;
		return this;
	}

	/**
	 * Makes a copy of this property, referencing the same resources (not copies) as the original.
	 * @hidden
	 */
	public clone(): Property {
		throw new NotImplementedError();
	}

	/**
	 * Returns a list of all properties that hold a reference to this property. For example, a
	 * material may hold references to various textures, but a texture does not hold references
	 * to the materials that use it.
	 *
	 * It is often necessary to filter the results for a particular type: some resources, like
	 * {@link Accessor}s, may be referenced by different types of properties. Most properties
	 * include the {@link Root} as a parent, which is usually not of interest.
	 *
	 * Usage:
	 *
	 * ```ts
	 * const materials = texture
	 * 	.listParents()
	 * 	.filter((p) => p instanceof Material)
	 * ```
	 */
	public listParents(): Property[] {
		return this.listGraphParents() as Property[];
	}
}
