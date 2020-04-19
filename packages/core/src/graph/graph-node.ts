import { Graph } from './graph';
import { Link } from './graph-links';

/**
 * Represents a node in a {@link Graph}.
 *
 * @hidden
 * @category Graph
 */
export abstract class GraphNode {
	protected readonly graph: Graph;
	private disposed = false;
	constructor(graph: Graph) {
		this.graph = graph;
	}

	/** Returns true if the node has been permanently removed from the graph. */
	public isDisposed(): boolean { return this.disposed; }

	/**
	 * Removes both inbound references to and outbound references from this object. At the end
	 * of the process the object holds no references, and nothing holds references to it. A
	 * disposed object is not reusable.
	 */
	public dispose(): void {
		this.graph.disconnectChildren(this);
		this.graph.disconnectParents(this);
		this.disposed = true;
	}

	/**
	 * Removes all inbound references to this object. At the end of the process the object is
	 * considered 'detached': it may hold references to child resources, but nothing holds
	 * references to it. A detached object may be re-attached.
	 */
	public detach(): GraphNode {
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
	public swap(old: GraphNode, replacement: GraphNode): GraphNode {
		this.graph.getLinks()
			.filter((link) => link.getParent() === this && link.getChild() === old)
			.forEach((link) => (link.setChild(replacement)));
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
	protected addGraphChild(links: Link<GraphNode, GraphNode>[], link: Link<GraphNode, GraphNode>): GraphNode {
		links.push(link);
		link.onDispose(() => {
			const remaining = links.filter((l) => l !== link);
			links.length = 0;
			links.push(...remaining);
		});
		return this;
	}

	/**
	 * Removes a {@link GraphNode} from a {@link @GraphChildList}.
	 *
	 * @hidden
	 */
	protected removeGraphChild(links: Link<GraphNode, GraphNode>[], child: GraphNode): GraphNode {
		const pruned = links.filter((link) => link.getChild() === child);
		pruned.forEach((link) => link.dispose());
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
}
