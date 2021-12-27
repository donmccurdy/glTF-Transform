import { Transform } from '@gltf-transform/core';
export interface DedupOptions {
    /** List of {@link PropertyType} identifiers to be de-duplicated.*/
    propertyTypes: string[];
}
/**
 * Removes duplicate {@link Accessor}, {@link Mesh}, {@link Texture}, and {@link Material}
 * properties. Partially based on a
 * [gist by mattdesl](https://gist.github.com/mattdesl/aea40285e2d73916b6b9101b36d84da8). Only
 * accessors in mesh primitives, morph targets, and animation samplers are processed.
 *
 * Example:
 *
 * ```ts
 * document.getRoot().listMeshes(); // → [Mesh, Mesh, Mesh]
 *
 * await document.transform(dedup({propertyTypes: [PropertyType.MESH]}));
 *
 * document.getRoot().listMeshes(); // → [Mesh]
 * ```
 */
export declare const dedup: (_options?: DedupOptions) => Transform;
