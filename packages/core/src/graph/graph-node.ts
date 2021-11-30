import { Nullable, TypedArray } from '../constants';
import { Graph } from './graph';
import { Link } from './graph-links';

// References:
// - https://stackoverflow.com/a/70163679/1314762

// TODO(cleanup): Plain objects for edges.

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

/**
 * Represents a node in a {@link Graph}.
 *
 * @hidden
 * @category Graph
 */
export abstract class GraphNode<Attributes extends GraphNodeAttributes = any> {
	private _disposed = false;

	/** @internal @hidden */
	protected [$attributes] = this.getDefaultAttributes() as GraphNodeAttributesInternal<this, Attributes>;

	constructor(protected readonly graph: Graph<GraphNode>) {
		this.graph = graph;
	}

	// TODO(cleanup): Should be abstract.
	protected getDefaultAttributes(): Nullable<Attributes> {
		return {} as any;
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
	 * Attributes and references.
	 */

	protected get<K extends LiteralKeys<Attributes>>(key: K): Attributes[K] {
		return this[$attributes][key];
	}

	protected set<K extends LiteralKeys<Attributes>>(key: K, value: Attributes[K]): this {
		this[$attributes][key] = value;
		return this;
	}

	protected getRef<K extends RefKeys<Attributes>>(key: K): Attributes[K] | null {
		return this[$attributes][key] ? this[$attributes][key].getChild() : null;
	}

	protected setRef<K extends RefKeys<Attributes>>(
		key: K,
		value: Attributes[K] | null,
		metadata?: Record<string, unknown>
	): this {
		const prevLink = this[$attributes][key];
		if (prevLink) prevLink.dispose();

		if (!value) return this;

		const link = this.graph.link(key as string, this, value, metadata) as any;
		link.onDispose(() => delete this[$attributes][key]);
		this[$attributes][key] = link;
		return this;
	}

	protected listRefs<K extends RefListKeys<Attributes>>(key: K): Attributes[K] {
		return this[$attributes][key].map((link: Link<this, GraphNode>) => link.getChild());
	}

	protected addRef<K extends RefListKeys<Attributes>>(
		key: K,
		value: Attributes[K][keyof Attributes[K]],
		metadata?: Record<string, unknown>
	): this {
		const link = this.graph.link(key as string, this, value, metadata) as any;
		return this.addGraphChild(this[$attributes][key], link);
	}

	protected removeRef<K extends RefListKeys<Attributes>>(key: K, value: Attributes[K][keyof Attributes[K]]): this {
		return this.removeGraphChild(this[$attributes][key], value);
	}

	protected listRefMapKeys<K extends RefMapKeys<Attributes>>(key: K): string[] {
		return Object.keys(this[$attributes][key]);
	}

	protected listRefMapValues<K extends RefMapKeys<Attributes>>(key: K): Attributes[K][keyof Attributes[K]][] {
		return Object.values(this[$attributes][key]).map((link: any) => link.getChild());
	}

	protected getRefMap<K extends RefMapKeys<Attributes>>(
		key: K,
		subkey: string
	): Attributes[K][keyof Attributes[K]] | null {
		return this[$attributes][key][subkey] ? this[$attributes][key][subkey].getChild() : null;
	}

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
