import { GLTF } from '@gltf-transform/core';
/**
 * Returns true for a fallback buffer, else false.
 *
 *   - All references to the fallback buffer must come from bufferViews that
 *     have a EXT_meshopt_compression extension specified.
 *   - No references to the fallback buffer may come from
 *     EXT_meshopt_compression extension JSON.
 */
export declare function isFallbackBuffer(bufferDef: GLTF.IBuffer): boolean;
