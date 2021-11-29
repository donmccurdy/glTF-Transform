import { Nullable, TypedArray } from '../constants';
import { Graph } from './graph';
import { Link } from './graph-links';

// References:
// - Latest: www.typescriptlang.org/play?#code/PQKj4yumFgCgAEJEFUAuBLANp9BPRAFXwAcBTAZwDoFlgEECLEAZPcgJwENtEBeRADsArtj4AfRACMA9rOzluQxFNEBbaV1WJK6TpiEBzANyN4wYImbk2HHtgCC6fZmkj0VADwAhbpXIAPgFEAG8ES0QASABtAGlyQkNEAGtE2QAzRD8AgF0ALmz-cnjE3MRyAA9PIQATSjtPB0QAfiKA0vxywqFyADcuMwsrAF8hyJtEACVyDOdXd09KX2LgwXDh6M7EZLT8TPbyAsPO8qqa+p2hDO0AYQALHFqIqyiotoeniuryOoaAcR4pHuADlZLVbGoxNgXtE3h9Hthnps3lEev0uLC3uiBpxxqMhkwyLYAMoiaQkCgrAIAGkQt1kdTwmEZa0QAAVMABjFJeBBRHLkGn8jZvba7dJZQXHQWnb4XBoMplYRmtRAJQg4wb8kYxPYHaUIQJDSbsJq8eYGRbeQVsskU4nUoWNLi8Y1ElgzOYuK0eG2rEL2ynkJ10wHcYFgiHu+ARGDxhPxugoRzSPQ8LnoRDh4GIAAis0MzMZtCQIAYsfg3DT+m4mcQXOw-gBQNB4NsoRG5kmOfulrcfuWRDZZtdTh9A6WXmHOi9-etQ5jCGr6brWcbzezraj5AA6ng+xOF9O6fPB-Lfpde2epzPBNej4Pp4FgudLy2I22IWE6IhSOTcC5RBuEfJZChvKgQk7YCGggyhCSQP8AO5RAjHIdAvDiC8-lSSUXQcOCvDgl8AAo9kKOIAEpwNAqh4nKDZECYxBOHQkROBUdBHhoECFkHPUyhMRBIkAArJAHg-xAAFlMEoShDCMaxiSuDJZE4dQQJZIRSyYrtKyY-9pEA3R0Mw7DLn1LJRwI2jlmIwIyMSCi6T6XgRHIGi+KWejqOsbif0QpiuJk6heN9Ly9nKQQXOwNyhmYli2I43yZLixBdN-AyjLQ9AvVMt8cIs6ZZkIuyHPwCifLg+j-Pi1j0HYzjuJCmyBK6ITRIk6TZPkxSWEMFS1I0ktf3SxDMpQgIctmPKfgKvC5xsoibNI8j1Wc1z3MQKq4lyHygoaRjmP25rPLoiKQmi2LhKscSpJkuTjF62x+tU9SVS038mLqhrkvgkaEFG0BE2B4Hk0QABRSpuHUUhFEQABJGHFHUX50CGj6ywrBBDCaDI61seH2S4ShVUOoRoc29N5NS7g0J6ERNG1RDIgyAxL0KInOBJlQoXEVKKHQDn0J0UQ+YB8wca4PGuQJoms0OmxCgAclqWQjCVnQla5ECldS8mUcKKnjCGUaN1kjlidVfKr23dt9y4wjCctoRgk7BAzYaOWzI-SM7YPR25ddwGQZDpMyzQShafIbTy3MLlGT0XRSFkLNBF6AB3C30BIyjf2oSaSKVmwlbpFW1aV3PEPz9DC-18gS8QJWSWT9AK4Q+OhETgArWQQgzi2ucZHO84LpW64bpWAClZArkea6VqOG4AFgARkrpjq+zpWBYbygW8o67EFukl7lkMRamEFPgK5GXSCzXsd2AzgjAZ1HtMQTevULne6T3lPKPalYQAoOT0lUqxTMpYEA903oXRedIABMABWSu0DR6s0wJeBuPcAFQNkJ-WYhd0GYLpNghCqD54-2ENCHBlYO6J0juoPu5BM6c25sPKuo9x6lxJNDWeHD55wMQEvZBc8t5ELqFg2QB8OqIBPmfJEl8sx1lvvfW235uDP1fkIdA798EZEIWzCRJCpGAMQCAhknBwE6IQEAA

// TODO(cleanup): Plain objects for edges.

type Literal = null | boolean | number | string | number[] | string[] | TypedArray | ArrayBuffer;
type LiteralKeys<T> = { [K in keyof T]-?: T[K] extends Literal ? K : never }[keyof T];
type RefKeys<T> = { [K in keyof T]-?: T[K] extends GraphNode ? K : never }[keyof T];
type RefListKeys<T> = { [K in keyof T]-?: T[K] extends GraphNode[] ? K : never }[keyof T];
type RefMapKeys<T> = { [K in keyof T]-?: T[K] extends { [key: string]: GraphNode } ? K : never }[keyof T];

// type LiteralValues<T> = { [K in LiteralKeys<T>]: T[K] };
// type RefValues<Parent extends GraphNode, T> = { [K in RefKeys<T>]-?: Link<Parent, T[K]> | null };
// type RefListValues<Parent extends GraphNode, T> = { [K in RefListKeys<T>]-?: Link<Parent, T[K]>[] };
// type RefMapValues<Parent extends GraphNode, T> = { [K in RefMapKeys<T>]-?: { [key: string]: Link<Parent, T[K]> } };

// type AllAttributes<Parent extends GraphNode, Base> = {
// 	[Key in keyof Base]: Base[Key] extends infer Child
// 		? Child extends GraphNode
// 			? Link<Parent, Child>
// 			: Child extends GraphNode[]
// 			? Link<Parent, Child[number]>[]
// 			: Child extends { [key: string]: GraphNode }
// 			? Link<Parent, Child[string]>
// 			: Child extends Literal
// 			? Child
// 			: never
// 		: never;
// };

// export type GraphNodeAttributes = Record<any, Literal | GraphNode | GraphNode[] | { [key: string]: GraphNode }>;
export type GraphNodeAttributes = Record<any, any>;

export const $attributes = Symbol('attributes');

/**
 * Represents a node in a {@link Graph}.
 *
 * @hidden
 * @category Graph
 */
export abstract class GraphNode<Attributes extends GraphNodeAttributes = any> {
	private _disposed = false;

	// public readonly DEFAULT_ATTRIBUTES = {} as Nullable<Attributes>;
	protected [$attributes]: Record<keyof Attributes, any> = this.getDefaultAttributes();

	// private _attributes = {} as Record<
	// 	keyof Attributes,
	// 	| LiteralValues<Attributes>
	// 	| RefValues<this, Attributes>
	// 	| RefListValues<this, Attributes>
	// 	| RefMapValues<this, Attributes>
	// >;

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

	protected setRef<K extends RefKeys<Attributes>>(key: K, value: Attributes[K] | null): this {
		const prevLink = this[$attributes][key];
		if (prevLink) prevLink.dispose();

		if (!value) return this;

		const link = this.graph.link(key as string, this, value) as any;
		link.onDispose(() => delete this[$attributes][key]);
		this[$attributes][key] = link;
		return this;
	}

	protected listRefs<K extends RefListKeys<Attributes>>(key: K): Attributes[K] {
		return this[$attributes][key].map((link: any) => link.getChild());
	}

	protected addRef<K extends RefListKeys<Attributes>>(key: K, value: Attributes[K][keyof Attributes[K]]): this {
		this[$attributes][key].push(this.graph.link(key as string, this, value));
		return this;
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
		value: Attributes[K][keyof Attributes[K]] | null
	): this {
		const prevLink = this[$attributes][key][subkey];
		if (prevLink) prevLink.dispose();

		if (!value) return this;

		const link = this.graph.link(subkey, this, value) as any;
		link.onDispose(() => delete this[$attributes][key][subkey]);
		this[$attributes][key][subkey] = link;
		return this;
	}
}
