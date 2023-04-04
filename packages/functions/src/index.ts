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

export * from './center.js';
export * from './clear-node-parent.js';
export * from './clear-node-transform.js';
export * from './dedup.js';
export * from './dequantize.js';
export * from './draco.js';
export * from './flatten.js';
export * from './get-node-scene.js';
export * from './inspect.js';
export * from './instance.js';
export * from './join-primitives.js';
export * from './join.js';
export * from './list-node-scenes.js';
export * from './list-texture-channels.js';
export * from './list-texture-info.js';
export * from './list-texture-slots.js';
export * from './meshopt.js';
export * from './metal-rough.js';
export * from './normals.js';
export * from './partition.js';
export * from './prune.js';
export * from './quantize.js';
export * from './resample.js';
export * from './reorder.js';
export * from './sequence.js';
export * from './simplify.js';
export * from './sort-primitive-weights.js';
export * from './sparse.js';
export * from './texture-compress.js';
export * from './tangents.js';
export * from './texture-resize.js';
export * from './transform-mesh.js';
export * from './transform-primitive.js';
export * from './unlit.js';
export * from './unpartition.js';
export { getGLPrimitiveCount, isTransformPending, createTransform } from './utils.js';
export * from './unweld.js';
export * from './vertex-color-space.js';
export * from './weld.js';
