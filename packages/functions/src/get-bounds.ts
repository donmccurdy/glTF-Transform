import { getBounds as _getBounds, type bbox, type Node, type Scene } from '@gltf-transform/core';

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
