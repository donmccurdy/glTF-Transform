import { Transform } from '@gltf-transform/core';
export interface PruneOptions {
    /** List of {@link PropertyType} identifiers to be de-duplicated.*/
    propertyTypes?: string[];
}
/**
 * Removes properties from the file if they are not referenced by a {@link Scene}. Commonly helpful
 * for cleaning up after other operations, e.g. allowing a node to be detached and any unused
 * meshes, materials, or other resources to be removed automatically.
 *
 * Example:
 *
 * ```
 * document.getRoot().listMaterials(); // → [Material, Material]
 *
 * await document.transform(prune());
 *
 * document.getRoot().listMaterials(); // → [Material]
 * ```
 *
 * No options are currently implemented for this function.
 */
export declare const prune: (_options?: PruneOptions) => Transform;
