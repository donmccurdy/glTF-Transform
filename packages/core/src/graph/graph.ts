import { Link } from './graph-links';
import { GraphNode } from './graph-node';

/**
 * A graph manages a network of {@link GraphNode} nodes, connected
 * by {@link @Link} edges.
 *
 * @hidden
 * @category Graph
 */
export class Graph<T extends GraphNode> {
	private _emptySet: Set<Link<T, T>> = new Set();

	private _links: Set<Link<T, T>> = new Set();
	private _parentRefs: Map<T, Set<Link<T, T>>> = new Map();
	private _childRefs: Map<T, Set<Link<T, T>>> = new Map();

	private _listeners: {[event: string]: ((target: unknown) => void)[]} = {};

	public on(type: string, fn: (target: unknown) => void): this {
		this._listeners[type] = this._listeners[type] || [];
		this._listeners[type].push(fn);
		return this;
	}

	public emit(type: string, target: T): this {
		for (const fn of this._listeners[type] || []) fn(target);
		return this;
	}

	/** Returns a list of all parent->child links on this graph. */
	public getLinks(): Link<T, T>[] {
		return Array.from(this._links);
	}

	/** Returns a list of all links on the graph having the given node as their child. */
	public listParentLinks(node: T): Link<T, T>[] {
		return Array.from(this._childRefs.get(node) || this._emptySet);
	}

	/** Returns a list of parent nodes for the given child node. */
	public listParents(node: T): T[] {
		return this.listParentLinks(node).map((link) => link.getParent());
	}

	/** Returns a list of all links on the graph having the given node as their parent. */
	public listChildLinks(node: T): Link<T, T>[] {
		return Array.from(this._parentRefs.get(node) || this._emptySet);
	}

	/** Returns a list of child nodes for the given parent node. */
	public listChildren(node: T): T[] {
		return this.listChildLinks(node).map((link) => link.getChild());
	}

	public disconnectChildren(node: T): this {
		const links = this._parentRefs.get(node) || this._emptySet;
		links.forEach((link) => link.dispose());
		return this;
	}

	public disconnectParents(node: T, filter?: (n: T) => boolean): this {
		let links = Array.from(this._childRefs.get(node) || this._emptySet);
		if (filter) {
			links = links.filter((link) => filter(link.getParent()));
		}
		links.forEach((link) => link.dispose());
		return this;
	}

	public swapChild(parent: T, prevChild: T, nextChild: T): this {
		const links = this._parentRefs.get(parent) || this._emptySet;
		Array.from(links)
			.filter((link) => link.getChild() === prevChild)
			.forEach((link) => {
				this._childRefs.get(prevChild)!.delete(link);

				link.setChild(nextChild);
				if (!this._childRefs.has(nextChild)) this._childRefs.set(nextChild, new Set());
				this._childRefs.get(nextChild)!.add(link);
			});
		return this;
	}

	/**
	* Creates a link between two {@link GraphNode} instances. Link is returned
	* for the caller to store.
	* @param a Owner
	* @param b Resource
	*/
	public link<A extends T>(name: string, a: A, b: null): null;
	public link<A extends T, B extends T>(name: string, a: A, b: B): Link<A, B>;
	public link<A extends T, B extends T>(name: string, a: A, b: B | null): Link<A, B> | null;
	public link<A extends T, B extends T>(name: string, a: A, b: B | null): Link<A, B> | null {
		// If there's no resource, return a null link. Avoids a lot of boilerplate in node setters.
		if (!b) return null;

		const link = new Link(name, a, b);
		this.registerLink(link);
		return link;
	}

	protected registerLink(link: Link<T, T>): Link<T, T> {
		this._links.add(link);

		const parent = link.getParent();
		if (!this._parentRefs.has(parent)) this._parentRefs.set(parent, new Set());
		this._parentRefs.get(parent)!.add(link);

		const child = link.getChild();
		if (!this._childRefs.has(child)) this._childRefs.set(child, new Set());
		this._childRefs.get(child)!.add(link);

		link.onDispose(() => this.unlink(link));
		return link;
	}

	/**
	* Removes the link from the graph. This method should only be invoked by
	* the onDispose() listener created in {@link link()}. The public method
	* of removing a link is {@link link.dispose()}.
	* @param link
	*/
	private unlink(link: Link<T, T>): this {
		this._links.delete(link);
		this._parentRefs.get(link.getParent())!.delete(link);
		this._childRefs.get(link.getChild())!.delete(link);
		return this;
	}
}
