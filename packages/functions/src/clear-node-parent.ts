import { Node, Scene } from '@gltf-transform/core';
import { multiply as multiplyMat4 } from 'gl-matrix/mat4';
import { getNodeScene } from './get-node-scene';

/**
 * Clears the parent of the given {@link Node}, leaving it attached
 * directly to its {@link Scene}. Parent transforms will be applied
 * to the Node, changing its local transform but leaving the world
 * transform unchanged.
 */
export function clearNodeParent(node: Node): Node {
	const scene = getNodeScene(node);
	const parent = node.getParent() as Scene | Node | null;

	if (!scene || !parent) {
		throw new Error('Node must be a descendant of a Scene.');
	}

	if (parent instanceof Scene) {
		return node;
	}

	// Apply inherited transforms to local matrix. Skinned meshes are not affected
	// by the node parent's trasnform, and can be ignored. Updates to IBMs and TRS
	// animations are out of scope in this context.
	node.setMatrix(node.getWorldMatrix());

	// Set scene as parent.
	parent.removeChild(node);
	scene.addChild(node);

	return node;
}
