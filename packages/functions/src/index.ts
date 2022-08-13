/**
 * # Functions
 *
 * Common glTF modifications, written using the core API.
 *
 * Most of these functions are _Transforms_, applying a modification to the {@link Document}, used
 * with {@link Document.transform}. This project includes many common transforms already, and
 * others can be quickly implemented using the same APIs. Other functions, like {@link getBounds},
 * provide non-mutating functionality on top of the existing glTF-Transform property types.
 *
 * ## Installation
 *
 * Install:
 *
 * ```shell
 * npm install --save @gltf-transform/functions
 * ```
 *
 * Import:
 *
 * ```typescript
 * import { NodeIO } from '@gltf-transform/core';
 * import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
 * import { weld, quantize, dedup } from '@gltf-transform/functions';
 *
 * const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
 * const document = await io.read('input.glb');
 *
 * await document.transform(
 * 	weld(),
 * 	quantize(),
 * 	dedup(),
 *
 * 	// Custom transform.
 * 	backfaceCulling({cull: true}),
 * );
 *
 * // Custom transform: enable/disable backface culling.
 * function backfaceCulling(options) {
 *   return (document) => {
 *     for (const material of document.getRoot().listMaterials()) {
 *       material.setDoubleSided(!options.cull);
 *     }
 *   };
 * }
 *
 * await io.write('output.glb', document);
 * ```
 *
 * @module functions
 */

export * from './center';
export * from './clear-node-parent';
export * from './clear-node-transform';
export * from './colorspace';
export * from './dedup';
export * from './dequantize';
export * from './draco';
export * from './flatten';
export * from './get-node-scene';
export * from './inspect';
export * from './instance';
export * from './join-primitives';
export * from './join';
export * from './meshopt';
export * from './metal-rough';
export * from './normals';
export * from './partition';
export * from './prune';
export * from './quantize';
export * from './resample';
export * from './reorder';
export * from './sequence';
export * from './simplify';
export * from './sort-primitive-weights';
export * from './sparse';
export * from './texture-compress';
export * from './tangents';
export * from './texture-resize';
export * from './transform-mesh';
export * from './transform-primitive';
export * from './unlit';
export * from './unpartition';
export { getGLPrimitiveCount, isTransformPending, createTransform } from './utils';
export * from './unweld';
export * from './weld';
export * from './list-texture-channels';
export * from './list-texture-info';
export * from './list-texture-slots';
