import { MathUtils, type mat4, type Node } from '@gltf-transform/core';
import { multiply as multiplyMat4 } from 'gl-matrix/mat4';
import { transformMesh } from './transform-mesh.js';

// biome-ignore format: Readability.
const IDENTITY: mat4 = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1
];

/**
 * Clears local transform of the {@link Node}, applying the transform to children and meshes.
 *
 * - Applies transform to children
 * - Applies transform to {@link Mesh mesh}
 * - Resets {@link Light lights}, {@link Camera cameras}, and other attachments to the origin
 *
 * Example:
 *
 * ```typescript
 * import { clearNodeTransform } from '@gltf-transform/functions';
 *
 * node.getTranslation(); // → [ 5, 0, 0 ]
 * node.getMesh(); // → vertex data centered at origin
 *
 * clearNodeTransform(node);
 *
 * node.getTranslation(); // → [ 0, 0, 0 ]
 * node.getMesh(); // → vertex data centered at [ 5, 0, 0 ]
 * ```
 *
 * To clear _all_ transforms of a Node, first clear its inherited transforms with
 * {@link clearNodeParent}, then clear the local transform with {@link clearNodeTransform}.
 */
export function clearNodeTransform(node: Node): Node {
	const mesh = node.getMesh();
	const localMatrix = node.getMatrix();

	if (mesh && !MathUtils.eq(localMatrix, IDENTITY)) {
		transformMesh(mesh, localMatrix);
	}

	for (const child of node.listChildren()) {
		const matrix = child.getMatrix();
		multiplyMat4(matrix, matrix, localMatrix);
		child.setMatrix(matrix);
	}

	return node.setMatrix(IDENTITY);
}
