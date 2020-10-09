import { Link } from './graph-links';
import { GraphNode } from './graph-node';

const EMPTY_SET: Set<Link<GraphNode, GraphNode>> = new Set();

/**
 * A graph manages a network of {@link GraphNode} nodes, connected
 * by {@link @Link} edges.
 *
 * @hidden
 * @category Graph
 */
export class Graph {
	private _links: Set<Link<GraphNode, GraphNode>> = new Set();
	private _parentRefs: Map<GraphNode, Set<Link<GraphNode, GraphNode>>> = new Map();
	private _childRefs: Map<GraphNode, Set<Link<GraphNode, GraphNode>>> = new Map();

	public getLinks(): Link<GraphNode, GraphNode>[] {
		return Array.from(this._links);
	}

	public listParents(node: GraphNode): GraphNode[] {
		const links = this._childRefs.get(node) || EMPTY_SET;
		return Array.from(links).map((link) => link.getParent());
	}

	public listChildren(node: GraphNode): GraphNode[] {
		const links = this._parentRefs.get(node) || EMPTY_SET;
		return Array.from(links).map((link) => link.getChild());
	}

	public disconnectChildren(node: GraphNode): this {
		const links = this._parentRefs.get(node) || EMPTY_SET;
		links.forEach((link) => link.dispose());
		return this;
	}

	public disconnectParents(node: GraphNode, filter?: (n: GraphNode) => boolean): this {
		let links = Array.from(this._childRefs.get(node) || EMPTY_SET);
		if (filter) {
			links = links.filter((link) => filter(link.getParent()));
		}
		links.forEach((link) => link.dispose());
		return this;
	}

	public swapChild(parent: GraphNode, prevChild: GraphNode, nextChild: GraphNode): this {
		const links = this._parentRefs.get(parent) || EMPTY_SET;
		Array.from(links)
			.filter((link) => link.getChild() === prevChild)
			.forEach((link) => {
				this._childRefs.get(prevChild).delete(link);

				link.setChild(nextChild);
				if (!this._childRefs.has(nextChild)) this._childRefs.set(nextChild, new Set());
				this._childRefs.get(nextChild).add(link);
			});
		return this;
	}

	/**
	* Creates a link between two {@link GraphNode} instances. Link is returned
	* for the caller to store.
	* @param a Owner
	* @param b Resource
	*/
	public link<A extends GraphNode, B extends GraphNode>(name: string, a: A, b: B): Link<A, B> {
		// If there's no resource, return a null link. Avoids a lot of boilerplate in node setters.
		if (!b) return null;

		const link = new Link(name, a, b);
		this.registerLink(link);
		return link;
	}

	protected registerLink(link: Link<GraphNode, GraphNode>): Link<GraphNode, GraphNode> {
		this._links.add(link);

		const parent = link.getParent();
		if (!this._parentRefs.has(parent)) this._parentRefs.set(parent, new Set());
		this._parentRefs.get(parent).add(link);

		const child = link.getChild();
		if (!this._childRefs.has(child)) this._childRefs.set(child, new Set());
		this._childRefs.get(child).add(link);

		link.onDispose(() => this.unlink(link));
		return link;
	}

	/**
	* Removes the link from the graph. This method should only be invoked by
	* the onDispose() listener created in {@link link()}. The public method
	* of removing a link is {@link link.dispose()}.
	* @param link
	*/
	private unlink(link: Link<GraphNode, GraphNode>): this {
		this._links.delete(link);
		this._parentRefs.get(link.getParent()).delete(link);
		this._childRefs.get(link.getChild()).delete(link);
		return this;
	}
}
