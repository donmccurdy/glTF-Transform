import { Scene, Node } from '@gltf-transform/core';

/**
 * Create a new node as child of the target {@link Scene} or {@link Node}.
 * Its existing children will be reparented under the new node.
 *
 * Example:
 *
 * ```javascript
 * import { transformScene } from '@gltf-transform/functions';
 *
 * let scene = document.getRoot().getDefaultScene()
 * // rotate the entire scene a quarter turn around the y axis
 * spliceNode(scene).setRotation([0, Math.SQRT1_2, 0, Math.SQRT1_2]);
 * ```
 *
 * @param parent Node or Scene whose children to reroot
 * @returns The new parent node
 */
export function spliceNode(parent: Scene | Node): Node {
	const newNode = new Node(parent.getGraph());
	for (const child of parent.listChildren()) {
		if (child.getSkin()) continue;
		newNode.addChild(child);
	}
	parent.addChild(newNode);
	return newNode;
}
