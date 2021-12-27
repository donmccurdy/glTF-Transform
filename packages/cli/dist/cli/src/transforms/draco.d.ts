import { Transform } from '@gltf-transform/core';
export interface DracoCLIOptions {
    method?: 'edgebreaker' | 'sequential';
    encodeSpeed?: number;
    decodeSpeed?: number;
    quantizePosition?: number;
    quantizeNormal?: number;
    quantizeColor?: number;
    quantizeTexcoord?: number;
    quantizeGeneric?: number;
    quantizationVolume?: 'mesh' | 'scene';
}
export declare const DRACO_DEFAULTS: DracoCLIOptions;
export declare const draco: (_options: DracoCLIOptions) => Transform;
