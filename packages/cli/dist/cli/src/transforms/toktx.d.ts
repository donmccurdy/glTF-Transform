import { Transform } from '@gltf-transform/core';
/**********************************************************************************************
 * Interfaces.
 */
export declare const Mode: {
    ETC1S: string;
    UASTC: string;
};
export declare const Filter: {
    BOX: string;
    TENT: string;
    BELL: string;
    BSPLINE: string;
    MITCHELL: string;
    LANCZOS3: string;
    LANCZOS4: string;
    LANCZOS6: string;
    LANCZOS12: string;
    BLACKMAN: string;
    KAISER: string;
    GAUSSIAN: string;
    CATMULLROM: string;
    QUADRATIC_INTERP: string;
    QUADRATIC_APPROX: string;
    QUADRATIC_MIX: string;
};
interface GlobalOptions {
    mode: string;
    slots?: string;
    filter?: string;
    filterScale?: number;
    powerOfTwo?: boolean;
}
export interface ETC1SOptions extends GlobalOptions {
    quality?: number;
    compression?: number;
    maxEndpoints?: number;
    maxSelectors?: number;
    rdoOff?: boolean;
    rdoThreshold?: number;
}
export interface UASTCOptions extends GlobalOptions {
    level?: number;
    rdo?: number;
    rdoDictionarySize?: number;
    rdoBlockScale?: number;
    rdoStdDev?: number;
    rdoMultithreading?: boolean;
    zstd?: number;
}
export declare const ETC1S_DEFAULTS: {
    filter: string;
    filterScale: number;
    powerOfTwo: boolean;
    slots: string;
    quality: number;
    compression: number;
};
export declare const UASTC_DEFAULTS: {
    filter: string;
    filterScale: number;
    powerOfTwo: boolean;
    slots: string;
    level: number;
    rdo: number;
    rdoDictionarySize: number;
    rdoBlockScale: number;
    rdoStdDev: number;
    rdoMultithreading: boolean;
    zstd: number;
};
/**********************************************************************************************
 * Implementation.
 */
export declare const toktx: (options: ETC1SOptions | UASTCOptions) => Transform;
export {};
