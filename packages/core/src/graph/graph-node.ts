import { Graph } from './graph';
import { Link } from './graph-links';

/** Represents a node in a {@link Graph}. */
export abstract class GraphNode {
	protected readonly graph: Graph;
	private disposed = false;
	constructor(graph: Graph) {
		this.graph = graph;
	}

	/** Returns true if the element has been permanently removed from the graph. */
	public isDisposed(): boolean { return this.disposed; }

	/**
	* Removes both inbound references to and outbound references from this element.
	*/
	public dispose(): void {
		this.graph.disconnectChildElements(this);
		this.graph.disconnectParentElements(this);
		this.disposed = true;
	}

	/**
	* Removes all inbound references to this element. Subclasses do not override this method.
	*/
	public detach(): GraphNode {
		this.graph.disconnectParentElements(this);
		return this;
	}

	/**
	* Adds a Link to a managed {@link @GraphChildList}, and sets up a listener to
	* remove the link if it's disposed. This function is only for lists of links,
	* annotated with {@link @GraphChildList}. Properties are annotated and managed by
	* {@link @GraphChild} instead.
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
	* Removes a {@link GraphElement} from a {@link @GraphChildList}.
	*/
	protected removeGraphChild(links: Link<GraphNode, GraphNode>[], child: GraphNode): GraphNode {
		const pruned = links.filter((link) => link.getRight() === child);
		pruned.forEach((link) => link.dispose());
		return this;
	}
}
