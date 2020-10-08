import { Link } from './graph-links';
import { GraphNode } from './graph-node';

/**
 * A graph manages a network of {@link GraphNode} nodes, connected
 * by {@link @Link} edges.
 *
 * @hidden
 * @category Graph
 */
export class Graph {
	private _links: Set<Link<GraphNode, GraphNode>> = new Set();
	private _parentRefs: Map<GraphNode, Link<GraphNode, GraphNode>[]> = new Map();
	private _childRefs: Map<GraphNode, Link<GraphNode, GraphNode>[]> = new Map();

	public getLinks(): Link<GraphNode, GraphNode>[] {
		return Array.from(this._links);
	}

	public listParents(node: GraphNode): GraphNode[] {
		const links = this._childRefs.get(node) || [];
		return links.map((link) => link.getParent());
	}

	public listChildren(node: GraphNode): GraphNode[] {
		const links = this._parentRefs.get(node) || [];
		return links.map((link) => link.getChild());
	}

	public disconnectChildren(node: GraphNode): this {
		const links = this._parentRefs.get(node) || [];
		links.forEach((link) => link.dispose());
		return this;
	}

	public disconnectParents(node: GraphNode, filter?: (n: GraphNode) => boolean): this {
		let links = this._childRefs.get(node) || [];
		if (filter) {
			links = links.filter((link) => filter(link.getParent()));
		}
		links.forEach((link) => link.dispose());
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
		if (!this._parentRefs.has(parent)) this._parentRefs.set(parent, []);
		this._parentRefs.get(parent).push(link);

		const child = link.getChild();
		if (!this._childRefs.has(child)) this._childRefs.set(child, []);
		this._childRefs.get(child).push(link);

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

		const parentRefs = this._parentRefs.get(link.getParent())
			.filter((_link) => link !== _link);
		this._parentRefs.set(link.getParent(), parentRefs);

		const childRefs = this._childRefs.get(link.getChild())
			.filter((_link) => link !== _link);
		this._childRefs.set(link.getChild(), childRefs);

		return this;
	}
}
