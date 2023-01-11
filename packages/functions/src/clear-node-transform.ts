import { mat4, MathUtils, Node } from '@gltf-transform/core';
import { transformMesh } from './transform-mesh';

// prettier-ignore
const IDENTITY: mat4 = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1
];

/**
 * Clears the local transform of the {@link Node}. If a {@link Mesh}
 * is attached to the Node, the transform will be applied to the Mesh. If
 * {@link Light Lights}, {@link Camera Cameras}, or other objects
 * are attached to the Node, their local transforms will be cleared.
 */
export function clearNodeTransform(node: Node): Node {
	const mesh = node.getMesh();
	const matrix = node.getMatrix();

	if (mesh && !MathUtils.eq(matrix, IDENTITY)) {
		transformMesh(mesh, matrix);
	}

	return node;
}
