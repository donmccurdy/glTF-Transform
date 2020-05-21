import { GraphNode } from '../graph';
import { PropertyGraph } from './property-graph';

/**
 * # Property
 *
 * *Properties represent distinct resources in a glTF asset, referenced by other properties.*
 *
 * For example, each material and texture is a property, with material properties holding
 * references to the textures. All properties are created with factory methods on the
 * {@link Document} in which they should be constructed. Properties are destroyed by calling
 * {@link dispose}().
 *
 * Usage:
 *
 * ```ts
 * const texture = doc.createTexture('myTexture');
 * doc.listTextures(); // → [texture x 1]
 *
 * // Attach a texture to a material.
 * material.setBaseColorTexture(texture);
 * material.getBaseColortexture(); // → texture
 *
 * // Detaching a texture removes any references to it, except from the doc.
 * texture.detach();
 * material.getBaseColorTexture(); // → null
 * doc.listTextures(); // → [texture x 1]
 *
 * // Disposing a texture removes all references to it, and its own references.
 * texture.dispose();
 * doc.listTextures(); // → []
 * ```
 *
 * Reference:
 * - [glTF → Concepts](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#concepts)
 *
 * @category Properties
 */
export abstract class Property extends GraphNode {
	/** Property type. */
	public readonly propertyType: string;

	protected readonly _graph: PropertyGraph;
	protected _name = '';

	// TODO(feat): Extras should be Properties.
	protected _extras: object = {};

	// TODO(feat): Extensions should be Properties.
	protected _extensions: object = {};

	/** @hidden */
	constructor(graph: PropertyGraph, name = '') {
		super(graph);
		this._name = name;
	}

	/**
	 * Returns the name of this property. While names are not required to be unique, this is
	 * encouraged, and non-unique names will be overwritten in some tools. For custom data about
	 * a property, prefer to use Extras.
	 */
	public getName(): string { return this._name; }

	/**
	 * Sets the name of this property. While names are not required to be unique, this is
	 * encouraged, and non-unique names will be overwritten in some tools. For custom data about
	 * a property, prefer to use Extras.
	 */
	public setName(name: string): this {
		this._name = name;
		return this;
	}

	/** @hidden */
	public getExtras(): object { return this._extras; }

	/** @hidden */
	public setExtras(extras: object): this {
		this._extras = extras;
		return this;
	}

	/** @hidden */
	public getExtensions(): object { return this._extensions; }

	/** @hidden */
	public setExtensions(extensions: object): this {
		this._extensions = extensions;
		return this;
	}

	/**
	 * Makes a copy of this property, referencing the same resources (not copies) as the original.
	 * @hidden
	 */
	public clone(): Property {
		throw new Error('Not implemented.');
	}

	public detach(): this {
		// Detaching should keep properties in the same Document, and attached to its root.
		this._graph.disconnectParents(this, (n: Property) => n.propertyType !== 'Root');
		return this;
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
