import { Transform } from '@gltf-transform/core';
/** Options for the {@link colorspace} function. */
export interface ColorspaceOptions {
    /** Must be `"sRGB"`. Required. */
    inputEncoding: string;
}
/**
 * Vertex color colorspace correction. The glTF format requires vertex colors to be stored
 * as linear values, and this function provides a way to correct vertex colors that are
 * (incorrectly) sRGB.
 */
export declare function colorspace(options: ColorspaceOptions): Transform;
