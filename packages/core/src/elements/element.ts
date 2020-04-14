import { NOT_IMPLEMENTED } from '../constants';
import { GraphNode } from '../graph';
import { ElementGraph } from './element-graph';

/**
 * @category Elements
 */
export abstract class Element extends GraphNode {
	protected readonly graph: ElementGraph;
	protected name = '';

	// TODO(donmccurdy): Extras should be Elements.
	protected extras: object = {};

	// TODO(donmccurdy): Extensions should be Elements.
	protected extensions: object = {};

	constructor(graph: ElementGraph, name = '') {
		super(graph);
		this.name = name;
	}

	public getName(): string { return this.name; }
	public setName(name: string): Element {
		this.name = name;
		return this;
	}

	public getExtras(): object { return this.extras; }
	public setExtras(extras: object): Element {
		this.extras = extras;
		return this;
	}

	public getExtensions(): object { return this.extensions; }
	public setExtensions(extensions: object): Element {
		this.extensions = extensions;
		return this;
	}

	/**
	* Makes a copy of this element with no inbound links, and with cloned outbound links.
	*/
	public clone(): Element {
		throw NOT_IMPLEMENTED;
	}

	/**
	* Returns true if the given element is equivalent to this one. Equivalency requires that all
	* outbound links reference the same elements. Inbound links are not considered.
	*/
	public equals(element: Element): boolean {
		throw NOT_IMPLEMENTED;
	}
}
