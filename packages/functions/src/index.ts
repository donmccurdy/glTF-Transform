/**
 * # Functions
 *
 * Common glTF modifications, written using the core API.
 *
 * Most of these functions are _Transforms_, applying a modification to the {@link Document}, used
 * with {@link Document.transform}. This project includes many common transforms already, and
 * others can be quickly implemented using the same APIs. Other functions, like {@link bounds},
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
 * import { dedup, quantize, weld } from '@gltf-transform/functions';
 *
 * const io = new NodeIO();
 * const document = io.read('input.glb');
 *
 * await document.transform(
 * 	weld(),
 * 	quantize(),
 * 	dedup()
 * );
 *
 * io.write('output.glb', document);
 * ```
 *
 * @module functions
 */

export { bounds } from '@gltf-transform/core'; // backwards compatibility, remove in v0.12
export * from './center';
export * from './colorspace';
export * from './dedup';
export * from './inspect';
export * from './instance';
export * from './metal-rough';
export * from './partition';
export * from './prune';
export * from './quantize';
export * from './resample';
export * from './reorder';
export * from './sequence';
export * from './tangents';
export * from './texture-resize';
export * from './unweld';
export * from './weld';
