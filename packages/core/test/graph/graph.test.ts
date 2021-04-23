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

test('@gltf-transform/core::graph | list connections', t => {
	const graph = new Graph();
	const root = new TestNode(graph);
	const node1 = new TestNode(graph);
	const node2 = new TestNode(graph);

	node1.addNode(node2);
	root.addNode(node1);

	t.equal(graph.getLinks().length, 2, 'getLinks()');
	t.deepEqual(
		graph.listParentLinks(node1).map(link => link.getParent()), [root], 'listParentLinks(A)'
	);
	t.deepEqual(
		graph.listChildLinks(node1).map(link => link.getChild()), [node2], 'listChildLinks(A)'
	);
	t.deepEqual(
		graph.listParentLinks(node2).map(link => link.getParent()), [node1], 'listParentLinks(B)'
	);
	t.deepEqual(
		graph.listChildLinks(node2).map(link => link.getChild()), [], 'listParentLinks(B)'
	);
	t.end();
});
