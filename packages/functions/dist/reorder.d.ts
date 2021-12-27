import { Transform } from '@gltf-transform/core';
import type { MeshoptEncoder } from 'meshoptimizer';
/** Options for the {@link reorder} function. */
export interface ReorderOptions {
    /** MeshoptEncoder instance. */
    encoder?: typeof MeshoptEncoder;
    /**
     * Whether the order should be optimal for transmission size (recommended for Web)
     * or for GPU rendering performance. Default is 'size'.
     */
    target?: 'size' | 'performance';
}
/**
 * Optimizes {@link Mesh} {@link Primitive Primitives} for locality of reference. Choose whether
 * the order should be optimal for transmission size (recommended for Web) or for GPU rendering
 * performance. Requires a MeshoptEncoder instance from the Meshoptimizer library.
 *
 * Example:
 *
 * ```ts
 * import { MeshoptEncoder } from 'meshoptimizer';
 * import { reorder } from '@gltf-transform/functions';
 *
 * await document.transform(
 * 	reorder({encoder: MeshoptEncoder})
 * );
 * ```
 */
export declare function reorder(_options?: ReorderOptions): Transform;
