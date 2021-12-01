import { Nullable, TypedArray } from '../constants';
import { Graph } from './graph';
import { Link } from './graph-links';

// References:
// - https://stackoverflow.com/a/70163679/1314762

export type GraphNodeAttributes = Record<string, any>;

type Literal = null | boolean | number | string | number[] | string[] | TypedArray | ArrayBuffer;
type LiteralKeys<T> = { [K in keyof T]-?: T[K] extends Literal ? K : never }[keyof T];
type RefKeys<T> = { [K in keyof T]-?: T[K] extends GraphNode ? K : never }[keyof T];
type RefListKeys<T> = { [K in keyof T]-?: T[K] extends GraphNode[] ? K : never }[keyof T];
type RefMapKeys<T> = { [K in keyof T]-?: T[K] extends { [key: string]: GraphNode } ? K : never }[keyof T];

type GraphNodeAttributesInternal<Parent extends GraphNode, Attributes extends GraphNodeAttributes> = {
	[Key in keyof Attributes]: Key extends RefKeys<Attributes>
		? Link<Parent, Attributes[Key]>
		: Key extends RefListKeys<Attributes>
		? Link<Parent, Attributes[Key]>[]
		: Key extends RefMapKeys<Attributes>
		? Record<string, Link<Parent, Attributes[Key]>>
		: Attributes[Key];
};

export const $attributes = Symbol('attributes');
export const $immutableKeys = Symbol('immutableKeys');

/**
 * Represents a node in a {@link Graph}.
 *
 * @hidden
 * @category Graph
 */
export abstract class GraphNode<Attributes extends GraphNodeAttributes = any> {
	private _disposed = false;

	/**
	 * Internal graph used to search and maintain references.
	 * @hidden
	 */
	protected readonly graph: Graph<GraphNode>;

	/**
	 * Attributes (literal values and GraphNode references) associated with this instance. For each
	 * GraphNode reference, the attributes stores a Link. List and Map references are stored as
	 * arrays and dictionaries of Links.
	 * @internal
	 */
	protected readonly [$attributes]: GraphNodeAttributesInternal<this, Attributes>;

	/**
	 * Attributes included with `getDefaultAttributes` are considered immutable, and cannot be
	 * modifed by `.setRef()`, `.copy()`, or other GraphNode methods. Both the links and the
	 * properties will be disposed with the parent GraphNode.
	 *
	 * Currently, only single-link references (getRef/setRef) are supported as immutables.
	 *
	 * @internal
	 */
	protected readonly [$immutableKeys]: Set<string>;

	constructor(graph: Graph<GraphNode>) {
		this.graph = graph;
		this[$immutableKeys] = new Set();
		this[$attributes] = this._createAttributes();
	}

	/**
	 * Returns default attributes for the graph node. Subclasses having any attributes (either
	 * literal values or references to other graph nodes) must override this method. Literal
	 * attributes should be given their default values, if any. References should generally be
	 * initialized as empty (Ref → null, RefList → [], RefMap → {}) and then modified by setters.
	 *
	 * Any single-link references (setRef) returned by this method will be considered immutable,
	 * to be owned by and disposed with the parent node. Multi-link references (addRef, removeRef,
	 * setRefMap) cannot be returned as default attributes.
	 */
	protected getDefaultAttributes(): Nullable<Attributes> {
		return {} as Nullable<Attributes>;
	}

	/**
	 * Constructs and returns an object used to store a graph nodes attributes. Compared to the
	 * default Attributes interface, this has two distinctions:
	 *
	 * 1. Slots for GraphNode<T> objects are replaced with slots for Link<this, GraphNode<T>>
	 * 2. GraphNode<T> objects provided as defaults are considered immutable
	 *
	 * @internal
	 */
	private _createAttributes(): GraphNodeAttributesInternal<this, Attributes> {
		const defaultAttributes = this.getDefaultAttributes();
		const attributes = {} as GraphNodeAttributesInternal<this, Attributes>;
		for (const key in defaultAttributes) {
			const value = defaultAttributes[key] as any;
			if (value instanceof GraphNode) {
				const link = this.graph.link(key as string, this, value);
				link.onDispose(() => value.dispose());
				this[$immutableKeys].add(key);
				attributes[key] = link as any;
			} else {
				attributes[key] = value as any;
			}
		}
		return attributes;
	}

	/**
	 * Returns true if links between this and the given node are allowed. Validates only that the
	 * objects are both {@link GraphNode} instances and on the same graph, not that they are
	 * semantically compatible.
	 *
	 * @internal
	 */
	public canLink(other: GraphNode): boolean {
		return this.graph === other.graph;
	}

	/** Returns true if the node has been permanently removed from the graph. */
	public isDisposed(): boolean {
		return this._disposed;
	}

	/**
	 * Removes both inbound references to and outbound references from this object. At the end
	 * of the process the object holds no references, and nothing holds references to it. A
	 * disposed object is not reusable.
	 */
	public dispose(): void {
		this.graph.disconnectChildren(this);
		this.graph.disconnectParents(this);
		this._disposed = true;
		this.graph.emit('dispose', this);
	}

	/**
	 * Removes all inbound references to this object. At the end of the process the object is
	 * considered 'detached': it may hold references to child resources, but nothing holds
	 * references to it. A detached object may be re-attached.
	 */
	public detach(): this {
		this.graph.disconnectParents(this);
		return this;
	}

	/**
	 * Transfers this object's references from the old node to the new one. The old node is fully
	 * detached from this parent at the end of the process.
	 *
	 * @hidden This method works imperfectly with Root, Scene, and Node properties, which may
	 * already hold equivalent links to the replacement object.
	 */
	public swap(old: GraphNode, replacement: GraphNode): this {
		this.graph.swapChild(this, old, replacement);
		return this;
	}

	/**********************************************************************************************
	 * Internal attribute management APIs.
	 */

	/**
	 * Adds a Link to a managed {@link @GraphChildList}, and sets up a listener to
	 * remove the link if it's disposed. This function is only for lists of links,
	 * annotated with {@link @GraphChildList}. Properties are annotated and managed by
	 * {@link @GraphChild} instead.
	 *
	 * @hidden
	 */
	protected addGraphChild(links: Link<GraphNode, GraphNode>[], link: Link<GraphNode, GraphNode>): this {
		// TODO(cleanup): Make private?
		links.push(link);
		link.onDispose(() => {
			const remaining = links.filter((l) => l !== link);
			links.length = 0;
			for (const link of remaining) links.push(link);
		});
		return this;
	}

	/**
	 * Removes a {@link GraphNode} from a {@link GraphChildList}.
	 *
	 * @hidden
	 */
	protected removeGraphChild(links: Link<GraphNode, GraphNode>[], child: GraphNode): this {
		// TODO(cleanup): Make private?
		const pruned = links.filter((link) => link.getChild() === child);
		pruned.forEach((link) => link.dispose());
		return this;
	}

	/**
	 * Removes all {@link GraphNode}s from a {@link GraphChildList}.
	 *
	 * @hidden
	 */
	protected clearGraphChildList(links: Link<GraphNode, GraphNode>[]): this {
		// TODO(cleanup): Make private?
		while (links.length > 0) links[0].dispose();
		return this;
	}

	/**
	 * Returns a list of all nodes that hold a reference to this node.
	 *
	 * Available publicly by {@link Property}'s `.listParents()`.
	 *
	 * @hidden
	 */
	protected listGraphParents(): GraphNode[] {
		// TODO(cleanup): Make public?
		return this.graph.listParents(this) as GraphNode[];
	}

	/**********************************************************************************************
	 * Literal attributes.
	 */

	/** @hidden */
	protected get<K extends LiteralKeys<Attributes>>(key: K): Attributes[K] {
		return this[$attributes][key];
	}

	/** @hidden */
	protected set<K extends LiteralKeys<Attributes>>(key: K, value: Attributes[K]): this {
		this[$attributes][key] = value;
		return this;
	}

	/**********************************************************************************************
	 * 1:1 graph node references.
	 */

	/** @hidden */
	protected getRef<K extends RefKeys<Attributes>>(key: K): Attributes[K] | null {
		return this[$attributes][key] ? this[$attributes][key].getChild() : null;
	}

	/** @hidden */
	protected setRef<K extends RefKeys<Attributes>>(
		key: K,
		value: Attributes[K] | null,
		metadata?: Record<string, unknown>
	): this {
		if (this[$immutableKeys].has(key as string)) {
			throw new Error(`Cannot overwrite immutable attribute, "${key}".`);
		}

		const prevLink = this[$attributes][key];
		if (prevLink) prevLink.dispose();

		if (!value) return this;

		const link = this.graph.link(key as string, this, value, metadata) as any;
		link.onDispose(() => delete this[$attributes][key]);
		this[$attributes][key] = link;
		return this;
	}

	/**********************************************************************************************
	 * 1:many graph node references.
	 */

	/** @hidden */
	protected listRefs<K extends RefListKeys<Attributes>>(key: K): Attributes[K] {
		return this[$attributes][key].map((link: Link<this, GraphNode>) => link.getChild());
	}

	/** @hidden */
	protected addRef<K extends RefListKeys<Attributes>>(
		key: K,
		value: Attributes[K][keyof Attributes[K]],
		metadata?: Record<string, unknown>
	): this {
		const link = this.graph.link(key as string, this, value, metadata) as any;
		return this.addGraphChild(this[$attributes][key], link);
	}

	/** @hidden */
	protected removeRef<K extends RefListKeys<Attributes>>(key: K, value: Attributes[K][keyof Attributes[K]]): this {
		return this.removeGraphChild(this[$attributes][key], value);
	}

	/**********************************************************************************************
	 * Named 1:many (map) graph node references.
	 */

	/** @hidden */
	protected listRefMapKeys<K extends RefMapKeys<Attributes>>(key: K): string[] {
		return Object.keys(this[$attributes][key]);
	}

	/** @hidden */
	protected listRefMapValues<K extends RefMapKeys<Attributes>>(key: K): Attributes[K][keyof Attributes[K]][] {
		return Object.values(this[$attributes][key]).map((link: any) => link.getChild());
	}

	/** @hidden */
	protected getRefMap<K extends RefMapKeys<Attributes>>(
		key: K,
		subkey: string
	): Attributes[K][keyof Attributes[K]] | null {
		return this[$attributes][key][subkey] ? this[$attributes][key][subkey].getChild() : null;
	}

	/** @hidden */
	protected setRefMap<K extends RefMapKeys<Attributes>>(
		key: K,
		subkey: string,
		value: Attributes[K][keyof Attributes[K]] | null,
		metadata?: Record<string, unknown>
	): this {
		const prevLink = this[$attributes][key][subkey];
		if (prevLink) prevLink.dispose();

		if (!value) return this;

		const link = this.graph.link(subkey, this, value, metadata) as any;
		link.onDispose(() => delete this[$attributes][key][subkey]);
		this[$attributes][key][subkey] = link;
		return this;
	}
}
