import { bbox, Primitive } from '@gltf-transform/core';
import type { EncoderModule } from 'draco3dgltf';
export declare let encoderModule: EncoderModule;
export declare enum EncoderMethod {
    EDGEBREAKER = 1,
    SEQUENTIAL = 0
}
export interface EncodedPrimitive {
    numVertices: number;
    numIndices: number;
    data: Uint8Array;
    attributeIDs: {
        [key: string]: number;
    };
}
export interface EncoderOptions {
    decodeSpeed?: number;
    encodeSpeed?: number;
    method?: EncoderMethod;
    quantizationBits?: {
        [key: string]: number;
    };
    quantizationVolume?: 'mesh' | 'scene' | bbox;
}
export declare function initEncoderModule(_encoderModule: EncoderModule): void;
/**
 * References:
 * - https://github.com/mrdoob/three.js/blob/dev/examples/js/exporters/DRACOExporter.js
 * - https://github.com/CesiumGS/gltf-pipeline/blob/master/lib/compressDracoMeshes.js
 */
export declare function encodeGeometry(prim: Primitive, _options?: EncoderOptions): EncodedPrimitive;
