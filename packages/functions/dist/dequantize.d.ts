import { Transform } from '@gltf-transform/core';
/** Options for the {@link dequantize} function. */
export interface DequantizeOptions {
    /**
     * Pattern (regex) used to filter vertex attribute semantics for quantization.
     * Default: `/^((?!JOINTS_).)*$/`.
     */
    pattern?: RegExp;
}
/**
 * Dequantize {@link Primitive Primitives}, removing {@link MeshQuantization `KHR_mesh_quantization`}
 * if present. Dequantization will increase the size of the mesh on disk and in memory, but may be
 * necessary for compatibility with applications that don't support quantization.
 */
export declare function dequantize(_options?: DequantizeOptions): Transform;
