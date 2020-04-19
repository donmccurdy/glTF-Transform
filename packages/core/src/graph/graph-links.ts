import { GraphNode } from './graph-node';

/**
 * Represents a connection between two {@link GraphNode} resources in a {@link Graph}.
 *
 * The left node is considered the owner, and the right node the resource. The
 * owner is responsible for being able find and remove a reference to a resource, given
 * that link. The resource does not hold a reference to the link or to the owner,
 * although that reverse lookup can be done on the graph.
 *
 * @hidden
 * @category Graph
 */
export class Link<Parent extends GraphNode, Child extends GraphNode> {
	private disposed = false;
	private readonly listeners: (() => void)[] = [];
	constructor(private readonly name: string, private parent: Parent, private child: Child) {}

	/** Name. */
	getName(): string { return this.name; }

	/** Owner node. */
	getParent(): Parent { return this.parent; }

	/** Resource node. */
	getChild(): Child { return this.child; }

	/** Destroys a (currently intact) link, updating both the graph and the owner. */
	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.listeners.forEach((fn) => fn());
		this.listeners.length = 0;
	}

	/** Registers a listener to be invoked if this link is destroyed. */
	onDispose(fn: () => void): Link<Parent, Child> {
		this.listeners.push(fn);
		return this;
	}

	/** Whether this link has been destroyed. */
	isDisposed(): boolean { return this.disposed; }
}
