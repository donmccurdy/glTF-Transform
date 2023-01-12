import { mat4, MathUtils, Node } from '@gltf-transform/core';
import { multiply as multiplyMat4 } from 'gl-matrix/mat4';
import { transformMesh } from './transform-mesh';

// prettier-ignore
const IDENTITY: mat4 = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1
];

/**
 * Clears local transform of the {@link Node}.
 *
 * - Applies transform to {@link Node.listChildren() children}
 * - Applies transform to {@link Mesh mesh}
 * - Resets {@link Light lights}, {@link Camera cameras}, and other attachments to the origin
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
