import { Scene, Node, getBounds as _getBounds, bbox } from '@gltf-transform/core';

/**
 * Computes bounding box (AABB) in world space for the given {@link Node} or {@link Scene}.
 *
 * Example:
 *
 * ```ts
 * import { getBounds } from '@gltf-transform/functions';
 *
 * const {min, max} = getBounds(scene);
 * ```
 */
export function getBounds(node: Node | Scene): bbox {
	return _getBounds(node);
}
