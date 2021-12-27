import { Transform } from '@gltf-transform/core';
export interface MeshoptCLIOptions {
    level?: 'medium' | 'high';
}
export declare const MESHOPT_DEFAULTS: Required<MeshoptCLIOptions>;
export declare const meshopt: (_options: MeshoptCLIOptions) => Transform;
