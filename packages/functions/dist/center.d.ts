import { Transform, vec3 } from '@gltf-transform/core';
/** Options for the {@link center} function. */
export interface CenterOptions {
    /** Location on the model to be considered the pivot, and recentered at the origin. */
    pivot?: 'center' | 'above' | 'below' | vec3;
}
/**
 * Centers the {@link Scene} at the origin, or above/below it. Transformations from animation,
 * skinning, and morph targets are not taken into account.
 *
 * Example:
 *
 * ```ts
 * await document.transform(center({pivot: 'below'}));
 * ```
 */
export declare function center(_options?: CenterOptions): Transform;
