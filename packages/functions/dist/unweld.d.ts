import { Transform } from '@gltf-transform/core';
/** Options for the {@link unweld} function. */
export interface UnweldOptions {
}
/**
 * De-index {@link Primitive}s, disconnecting any shared vertices. This operation will generally
 * increase the number of vertices in a mesh, but may be helpful for some geometry operations or
 * for creating hard edges.
 *
 * No options are currently implemented for this function.
 */
export declare function unweld(_options?: UnweldOptions): Transform;
