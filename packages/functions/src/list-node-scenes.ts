import { type Node, Scene } from '@gltf-transform/core';

/**
 * Finds the parent {@link Scene Scenes} associated with the given {@link Node}.
 * In most cases a Node is associated with only one Scene, but it is possible
 * for a Node to be located in two or more Scenes, or none at all.
 *
 * Example:
 *
 * ```typescript
 * import { listNodeScenes } from '@gltf-transform/functions';
 *
 * const node = document.getRoot().listNodes()
 *  .find((node) => node.getName() === 'MyNode');
 *
 * const scenes = listNodeScenes(node);
 * ```
 */
export function listNodeScenes(node: Node): Scene[] {
	const visited = new Set<Node>();

	let child = node;
	let parent: Node | null;

	while ((parent = child.getParentNode() as Node | null)) {
		if (visited.has(parent)) {
			throw new Error('Circular dependency in scene graph.');
		}
		visited.add(parent);
		child = parent;
	}

	return child.listParents().filter((parent) => parent instanceof Scene) as Scene[];
}
