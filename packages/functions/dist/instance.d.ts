import { Transform } from '@gltf-transform/core';
export interface InstanceOptions {
}
/**
 * Creates GPU instances (with `EXT_mesh_gpu_instancing`) for shared {@link Mesh} references. No
 * options are currently implemented for this function.
 */
export declare function instance(_options?: InstanceOptions): Transform;
