require('source-map-support').install();

const test = require('tape');
const { Root, Graph, Node } = require('../../');

test('@gltf-transform/core::graph | link management', t => {
	const graph = new Graph();
	const root = new Root(graph);
	const a = new Node(graph);
	const b = new Node(graph);

	root.addNode(a).addNode(b);
	a.addChild(b);
	t.deepEqual(root.listNodes(), [a, b], 'Added two nodes.');
	t.deepEqual(a.listChildren(), [b], 'Added a child');

	root.removeNode(a);
	t.deepEqual(root.listNodes(), [b], 'Removed a node.');

	b.dispose();
	t.deepEqual(root.listNodes(), [], 'Disposed a node.');

	// Subjective behavior, but might as well unit test it.
	root.addNode(a).addNode(b).addNode(b).addNode(b);
	t.deepEqual(root.listNodes(), [a, b, b, b], 'Added duplicate nodes.');
	root.removeNode(b);
	t.deepEqual(root.listNodes(), [a], 'Removed a duplicate node.');
	root.removeNode(b).removeNode(b).removeNode(b);
	t.deepEqual(root.listNodes(), [a], 'Removed a non-present node repeatedly.');

	// Detaching does not affect the root, disposing does.
	a.detach();
	t.deepEqual(root.listNodes(), [a], 'Detached a node.');
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

	const rootA = new Root(graphA);
	const rootB = new Root(graphB);

	const nodeA = new Node(graphA);
	const nodeB = new Node(graphB);

	rootA.addNode(nodeA);

	t.throws(() => rootB.addNode(nodeA), 'prevents linking node from another graph, used');
	t.throws(() => rootA.addNode(nodeB), 'prevents linking node from another graph, unused');
	t.end();
});
