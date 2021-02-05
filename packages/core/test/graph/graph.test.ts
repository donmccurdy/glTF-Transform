require('source-map-support').install();

import test from 'tape';
import { Graph, Property } from '../../';

/**
 * Simple test implementation of GraphNode.
 */
class TestNode extends Property {
	propertyType = 'test';
	public nodes = [];
	constructor(graph) {
		super(graph);
	}
	addNode(node): this {
		return this.addGraphChild(this.nodes, this.graph.link('node', this, node));
	}
	removeNode(node): this {
		return this.removeGraphChild(this.nodes, node);
	}
	listNodes(): Property[] {
		return this.nodes.map((link) => link.getChild());
	}
}

test('@gltf-transform/core::graph | link management', t => {
	const graph = new Graph();
	const root = new TestNode(graph);
	const a = new TestNode(graph);
	const b = new TestNode(graph);

	root.addNode(a).addNode(b);
	a.addNode(b);
	t.deepEqual(root.listNodes(), [a, b], 'Added two nodes.');
	t.deepEqual(a.listNodes(), [b], 'Added a child');

	root.removeNode(a);
	t.deepEqual(root.listNodes(), [b], 'Removed a node.');

	b.dispose();
	t.deepEqual(root.listNodes(), [], 'Disposed a node.');

	// Subjective behavior, but might as well unit test it.
	root.addNode(a)
		.addNode(b)
		.addNode(b)
		.addNode(b);
	t.deepEqual(root.listNodes(), [a, b, b, b], 'Added duplicate nodes.');
	root.removeNode(b);
	t.deepEqual(root.listNodes(), [a], 'Removed a duplicate node.');
	root.removeNode(b).removeNode(b).removeNode(b);
	t.deepEqual(root.listNodes(), [a], 'Removed a non-present node repeatedly.');

	// Detach.
	a.detach();
	t.deepEqual(root.listNodes(), [], 'Detached a node.');

	// Dispose.
	root.addNode(a);
	a.dispose();
	t.deepEqual(root.listNodes(), [], 'Disposed a node.');

	root.addNode(b);
	root.dispose();
	t.deepEqual(root.listNodes(), [], 'Disposed the root, confirmed empty.');
	t.equal(root.isDisposed(), true, 'Disposed the root, confirmed disposed.');

	t.end();
});

test('@gltf-transform/core::graph | prevents cross-graph linking', t => {
	const graphA = new Graph();
	const graphB = new Graph();

	const rootA = new TestNode(graphA);
	const rootB = new TestNode(graphB);

	const nodeA = new TestNode(graphA);
	const nodeB = new TestNode(graphB);

	rootA.addNode(nodeA);

	t.throws(() => rootB.addNode(nodeA), 'prevents linking node from another graph, used');
	t.throws(() => rootA.addNode(nodeB), 'prevents linking node from another graph, unused');
	t.end();
});
