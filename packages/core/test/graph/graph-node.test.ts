require('source-map-support').install();

import test from 'tape';
import { Graph, Property } from '../../';
import { IProperty } from '../../dist/properties';

interface ITestNode extends IProperty {
	nodes: TestNode[];
}

/**
 * Simple test implementation of GraphNode.
 */
class TestNode extends Property<ITestNode> {
	propertyType = 'test';
	getDefaults(): ITestNode {
		return { ...super.getDefaults(), nodes: [] };
	}
	addNode(node: TestNode): this {
		return this.addRef('nodes', node);
	}
	listNodes(): TestNode[] {
		return this.listRefs('nodes');
	}
}

test('@gltf-transform/core::graph-node | swap', (t) => {
	const graph = new Graph<Property>();
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
