import { Link } from './graph-links';
import { GraphNode } from './graph-node';

/**
 * A graph manages a network of {@link GraphElement} nodes, connected
 * by {@link @Link} edges.
 *
 * @hidden
 * @category Graph
 */
export class Graph {
	private links: Link<GraphNode, GraphNode>[] = [];

	// TODO(cleanup): Decide how/if to expose this.
	public getLinks(): Link<GraphNode, GraphNode>[] {
		return this.links;
	}

	public listParentElements(element: GraphNode): GraphNode[] {
		// TODO(optimize)
		return this.links
		.filter((link) => link.getRight() === element)
		.map((link) => link.getLeft());
	}

	public listChildElements(element: GraphNode): GraphNode[] {
		// TODO(optimize)
		return this.links
		.filter((link) => link.getLeft() === element)
		.map((link) => link.getRight());
	}

	public disconnectChildElements(element: GraphNode): Graph {
		// TODO(optimize)
		this.links
		.filter((link) => link.getLeft() === element)
		.forEach((link) => link.dispose());
		return this;
	}

	public disconnectParentElements(element: GraphNode): Graph {
		// TODO(optimize)
		this.links
		.filter((link) => link.getRight() === element)
		.forEach((link) => link.dispose());
		return this;
	}

	/**
	* Creates a link between two {@link GraphElement} instances. Link is returned
	* for the caller to store.
	* @param a Owner
	* @param b Resource
	*/
	public link(name: string, a: GraphNode, b: GraphNode | null): Link<GraphNode, GraphNode> {
		// If there's no resource, return a null link. Avoids a lot of boilerplate
		// in Element setters.
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
