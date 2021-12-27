import { Transform } from '@gltf-transform/core';
/** Options for the {@link tangents} function. */
export interface TangentsOptions {
    /**
     * Callback function to generate tangents from position, uv, and normal attributes.
     * Generally, users will want to provide the `generateTangents` from the
     * [mikktspace](https://github.com/donmccurdy/mikktspace-wasm) library, which is not
     * included by default.
     */
    generateTangents?: (pos: Float32Array, norm: Float32Array, uv: Float32Array) => Float32Array;
    /** Whether to overwrite existing `TANGENT` attributes. */
    overwrite?: boolean;
}
/**
 * Generates MikkTSpace vertex tangents for mesh primitives, which may fix rendering issues
 * occuring with some baked normal maps. Requires access to the [mikktspace](https://github.com/donmccurdy/mikktspace-wasm)
 * WASM package, or equivalent.
 *
 * Example:
 *
 * ```ts
 * import { generateTangents } from 'mikktspace';
 * import { tangents } from '@gltf-transform/functions';
 *
 * await document.transform(
 * 	tangents({generateTangents})
 * );
 * ```
 */
export declare function tangents(_options?: TangentsOptions): Transform;
