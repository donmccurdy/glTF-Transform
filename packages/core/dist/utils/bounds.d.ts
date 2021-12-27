import { bbox } from '../constants';
import type { Node, Scene } from '../properties';
/**
 * Computes bounding box (AABB) in world space for the given {@link Node} or {@link Scene}.
 *
 * Example:
 *
 * ```ts
 * const {min, max} = bounds(scene);
 * ```
 */
export declare function bounds(node: Node | Scene): bbox;
