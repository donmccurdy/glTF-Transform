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

test('@gltf-transform/core::graph-node | swap', t => {
	const graph = new Graph();
	const root = new TestNode(graph);
	const a = new TestNode(graph);
	const b = new TestNode(graph);

	root.addNode(a);
	t.deepEquals(root.listNodes(), [a], 'adds A');
	t.deepEqual(graph.listChildren(root), [a], 'consistent graph state, parentRefs');
	t.deepEqual(graph.listParents(a), [root], 'consistent graph state, childRefs (1/2)');
	t.deepEqual(graph.listParents(b), [], 'consistent graph state, childRefs (2/2)');

	root.swap(a, b);
	t.deepEquals(root.listNodes(), [b], 'swaps A -> B');
	t.deepEqual(graph.listChildren(root), [b], 'consistent graph state, parentRefs');
	t.deepEqual(graph.listParents(a), [], 'consistent graph state, childRefs (1/2)');
	t.deepEqual(graph.listParents(b), [root], 'consistent graph state, childRefs (2/2)');

	t.end();
});
