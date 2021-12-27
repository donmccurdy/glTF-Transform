import { Transform } from '@gltf-transform/core';
export interface ResampleOptions {
    tolerance?: number;
}
/**
 * Resample {@link Animation}s, losslessly deduplicating keyframes to reduce file size. Duplicate
 * keyframes are commonly present in animation 'baked' by the authoring software to apply IK
 * constraints or other software-specific features. Based on THREE.KeyframeTrack.optimize().
 *
 * Example: (0,0,0,0,1,1,1,0,0,0,0,0,0,0) --> (0,0,1,1,0,0)
 */
export declare const resample: (_options?: ResampleOptions) => Transform;
