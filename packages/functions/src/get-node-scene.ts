import { Node, Scene } from '@gltf-transform/core';

/**
 * Finds the parent {@link Scene} associated with the given {@link Node}.
 *
 * Example:
 *
 * ```typescript
 * import { getNodeScene } from '@gltf-transform/functions';
 *
 * const node = document.getRoot().listNodes()
 *  .find((node) => node.getName() === 'MyNode');
 *
 * const scene = getNodeScene(node);
 * ```
 */
export function getNodeScene(node: Node): Scene | null {
	const visited = new Set<Node>();

	let child = node;
	let parent: Node | Scene | null;

	while ((parent = child.getParent() as Node | Scene | null)) {
		if (parent instanceof Scene) {
			return parent;
		}
		if (visited.has(parent)) {
			throw new Error('Circular dependency in scene graph.');
		}
		visited.add(parent);
		child = parent;
	}

	return null;
}
