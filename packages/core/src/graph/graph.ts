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
	private links: Link<GraphNode, GraphNode>[] = [];

	public getLinks(): Link<GraphNode, GraphNode>[] {
		return this.links;
	}

	public listParents(node: GraphNode): GraphNode[] {
		// TODO(optimize)
		return this.links
			.filter((link) => link.getChild() === node)
			.map((link) => link.getParent());
	}

	public listChildren(node: GraphNode): GraphNode[] {
		// TODO(optimize)
		return this.links
			.filter((link) => link.getParent() === node)
			.map((link) => link.getChild());
	}

	public disconnectChildren(node: GraphNode): Graph {
		// TODO(optimize)
		this.links
			.filter((link) => link.getParent() === node)
			.forEach((link) => link.dispose());
		return this;
	}

	public disconnectParents(node: GraphNode): Graph {
		// TODO(optimize)
		this.links
			.filter((link) => link.getChild() === node)
			.forEach((link) => link.dispose());
		return this;
	}

	/**
	* Creates a link between two {@link GraphNode} instances. Link is returned
	* for the caller to store.
	* @param a Owner
	* @param b Resource
	*/
	public link(name: string, a: GraphNode, b: GraphNode | null): Link<GraphNode, GraphNode> {
		// If there's no resource, return a null link. Avoids a lot of boilerplate in node setters.
		if (!b) return null;

		const link = new Link(name, a, b);
		this.registerLink(link);
		return link;
	}

	protected registerLink(link: Link<GraphNode, GraphNode>): Link<GraphNode, GraphNode> {
		this.links.push(link);
		link.onDispose(() => this.unlink(link));
		return link;
	}

	/**
	* Removes the link from the graph. This method should only be invoked by
	* the onDispose() listener created in {@link link()}. The public method
	* of removing a link is {@link link.dispose()}.
	* @param link
	*/
	private unlink(link: Link<GraphNode, GraphNode>): Graph {
		this.links = this.links.filter((l) => l !== link);
		return this;
	}
}
