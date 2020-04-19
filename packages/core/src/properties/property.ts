import { NOT_IMPLEMENTED } from '../constants';
import { GraphNode } from '../graph';
import { PropertyGraph } from './property-graph';

/**
 * @category Properties
 */
export abstract class Property extends GraphNode {
	protected readonly graph: PropertyGraph;
	protected name = '';

	// TODO(feat): Extras should be Properties.
	protected extras: object = {};

	// TODO(feat): Extensions should be Properties.
	protected extensions: object = {};

	constructor(graph: PropertyGraph, name = '') {
		super(graph);
		this.name = name;
	}

	public getName(): string { return this.name; }
	public setName(name: string): Property {
		this.name = name;
		return this;
	}

	public getExtras(): object { return this.extras; }
	public setExtras(extras: object): Property {
		this.extras = extras;
		return this;
	}

	public getExtensions(): object { return this.extensions; }
	public setExtensions(extensions: object): Property {
		this.extensions = extensions;
		return this;
	}

	/**
	* Makes a copy of this property, referencing the same resources (not copies) as the original.
	*/
	public clone(): Property {
		throw NOT_IMPLEMENTED;
	}

	/**
	* Returns true if the given property is equivalent to this one. Equivalency requires that all
	* outbound links reference the same properties. Inbound links are not considered.
	*/
	public equals(property: Property): boolean {
		throw NOT_IMPLEMENTED;
	}

	/**
	 * Returns a list of all properties that hold a reference to this property. For example, a
	 * material may hold references to various textures, but a texture does not hold references
	 * to the materials that use it.
	 */
	public listParents(): Property[] {
		return this.listGraphParents() as Property[];
	}
}
