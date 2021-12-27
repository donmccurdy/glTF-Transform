import { Transform } from '@gltf-transform/core';
/** Options for the {@link quantize} function. */
export interface QuantizeOptions {
    /** Pattern (regex) used to filter vertex attribute semantics for quantization. Default: all. */
    pattern?: RegExp;
    /** Bounds for quantization grid. */
    quantizationVolume?: 'mesh' | 'scene';
    /** Quantization bits for `POSITION` attributes. */
    quantizePosition?: number;
    /** Quantization bits for `NORMAL` attributes. */
    quantizeNormal?: number;
    /** Quantization bits for `TEXCOORD_*` attributes. */
    quantizeTexcoord?: number;
    /** Quantization bits for `COLOR_*` attributes. */
    quantizeColor?: number;
    /** Quantization bits for `WEIGHT_*` attributes. */
    quantizeWeight?: number;
    /** Quantization bits for application-specific (`_*`) attributes. */
    quantizeGeneric?: number;
}
export declare const QUANTIZE_DEFAULTS: Required<QuantizeOptions>;
/**
 * References:
 * - https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_mesh_quantization
 * - http://www.aclockworkberry.com/normal-unpacking-quantization-errors/
 * - https://www.mathworks.com/help/dsp/ref/uniformencoder.html
 * - https://oroboro.com/compressed-unit-vectors/
 */
/**
 * Quantizes vertex attributes with `KHR_mesh_quantization`, reducing the size and memory footprint
 * of the file.
 */
declare const quantize: (_options?: QuantizeOptions) => Transform;
export { quantize };
