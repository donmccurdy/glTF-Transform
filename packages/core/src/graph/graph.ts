import { GraphNode } from "./graph-node";
import { Link } from "./graph-links";

/**
 * A graph manages a network of {@link GraphElement} nodes, connected
 * by {@link @Link} edges.
 */
export class Graph {
    private links: Link<GraphNode, GraphNode>[] = [];

    public listParentElements(element: GraphNode): GraphNode[] {
        // #optimize
        return this.links
            .filter((link) => link.getRight() === element)
            .map((link) => link.getLeft());
    }

    public listChildElements(element: GraphNode): GraphNode[] {
        // #optimize
        return this.links
            .filter((link) => link.getLeft() === element)
            .map((link) => link.getRight());
    }

    public disconnectChildElements(element: GraphNode): Graph {
        // #optimize
        this.links
            .filter((link) => link.getLeft() === element)
            .forEach((link) => link.dispose());
        return this;
    }

    public disconnectParentElements(element: GraphNode): Graph {
        // #optimize
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
    public link(a: GraphNode, b: GraphNode | null): Link<GraphNode, GraphNode> {
        // If there's no resource, return a null link. Avoids a lot of boilerplate
        // in Element setters.
        if (!b) return null;

        const link = new Link(a, b);
        this.registerLink(link);
        return link;
    }

    protected registerLink(link: Link<GraphNode, GraphNode>) {
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