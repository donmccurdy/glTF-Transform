import type { Node } from '@gltf-transform/core';
import { listNodeScenes } from './list-node-scenes.js';

/**
 * Clears the parent of the given {@link Node}, leaving it attached
 * directly to its {@link Scene}. Inherited transforms will be applied
 * to the Node. This operation changes the Node's local transform,
 * but leaves its world transform unchanged.
 *
 * Example:
 *
 * ```typescript
 * import { clearNodeParent } from '@gltf-transform/functions';
 *
 * scene.traverse((node) => { ... }); // Scene → … → Node
 *
 * clearNodeParent(node);
 *
 * scene.traverse((node) => { ... }); // Scene → Node
 * ```
 *
 * To clear _all_ transforms of a Node, first clear its inherited transforms with
 * {@link clearNodeParent}, then clear the local transform with {@link clearNodeTransform}.
 */
export function clearNodeParent(node: Node): Node {
	const scenes = listNodeScenes(node);
	const parent = node.getParentNode();

	if (!parent) return node;

	// Apply inherited transforms to local matrix. Skinned meshes are not affected
	// by the node parent's transform, and can be ignored. Updates to IBMs and TRS
	// animations are out of scope in this context.
	node.setMatrix(node.getWorldMatrix());

	// Add to Scene roots.
	parent.removeChild(node);
	for (const scene of scenes) scene.addChild(node);

	return node;
}
