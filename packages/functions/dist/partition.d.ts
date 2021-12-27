import { Transform } from '@gltf-transform/core';
export interface PartitionOptions {
    animations?: boolean | Array<string>;
    meshes?: boolean | Array<string>;
}
/**
 * Partitions the binary payload of a glTF file so separate mesh or animation data is in separate
 * `.bin` {@link Buffer}s. This technique may be useful for engines that support lazy-loading
 * specific binary resources as needed over the application lifecycle.
 *
 * Example:
 *
 * ```ts
 * document.getRoot().listBuffers(); // → [Buffer]
 *
 * await document.transform(partition({meshes: true}));
 *
 * document.getRoot().listBuffers(); // → [Buffer, Buffer, ...]
 * ```
 */
declare const partition: (_options?: PartitionOptions) => Transform;
export { partition };
