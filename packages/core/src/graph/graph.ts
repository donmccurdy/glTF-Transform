import { AttributeLink, Link, TextureLink } from "./graph-links";

import { Accessor } from "../elements/accessor";
import { GraphElement } from "./graph-element";
import { Material } from "../elements/material";
import { Primitive } from "../elements/mesh";
import { Texture } from "../elements/texture";

/**
 * A graph manages a network of {@link GraphElement} nodes, connected
 * by {@link @Link} edges.
 */
export class Graph {
    private links: Link<GraphElement, GraphElement>[] = [];

    public listParentElements(element: GraphElement): GraphElement[] {
        // #optimize
        return this.links
            .filter((link) => link.getRight() === element)
            .map((link) => link.getLeft());
    }

    public listChildElements(element: GraphElement): GraphElement[] {
        // #optimize
        return this.links
            .filter((link) => link.getLeft() === element)
            .map((link) => link.getRight());
    }

    public disconnectChildElements(element: GraphElement): Graph {
        // #optimize
        this.links
            .filter((link) => link.getLeft() === element)
            .forEach((link) => link.dispose());
        return this;
    }

    public disconnectParentElements(element: GraphElement): Graph {
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
    public link(a: GraphElement, b: GraphElement | null): Link<GraphElement, GraphElement> {
        // If there's no resource, return a null link. Avoids a lot of boilerplate
        // in Element setters.
        if (!b) return null;

        const link = new Link(a, b);
        this.registerLink(link);
        return link;
    }

    public linkTexture(a: Material, b: Texture): TextureLink {
        const link = new TextureLink(a, b);
        this.registerLink(link);
        return link;
    }

    public linkAttribute(a: Primitive, b: Accessor): AttributeLink {
        const link = new AttributeLink(a, b);
        this.registerLink(link);
        return link;
    }

    private registerLink(link: Link<GraphElement, GraphElement>) {
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
    private unlink(link: Link<GraphElement, GraphElement>): Graph {
        this.links = this.links.filter((l) => l !== link);
        return this;
    }
}