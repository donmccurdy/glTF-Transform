import { Transform } from '@gltf-transform/core';
/** Options for the {@link weld} function. */
export interface WeldOptions {
    /** Per-attribute tolerance used when merging similar vertices. */
    tolerance?: number;
}
/**
 * Index {@link Primitive}s and (optionally) merge similar vertices.
 */
export declare function weld(_options?: WeldOptions): Transform;
