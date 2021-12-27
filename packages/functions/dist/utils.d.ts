import { NdArray } from 'ndarray';
import { Primitive, Texture, Transform, TransformContext } from '@gltf-transform/core';
/**
 * Prepares a function used in an {@link Document.transform} pipeline. Use of this wrapper is
 * optional, and plain functions may be used in transform pipelines just as well. The wrapper is
 * used internally so earlier pipeline stages can detect and optimize based on later stages.
 */
export declare function createTransform(name: string, fn: Transform): Transform;
export declare function isTransformPending(context: TransformContext | undefined, initial: string, pending: string): boolean;
/** Maps pixels from source to target textures, with a per-pixel callback. */
export declare function rewriteTexture(source: Texture, target: Texture, fn: (pixels: NdArray, i: number, j: number) => void): Promise<Texture | null>;
export declare function getGLPrimitiveCount(prim: Primitive): number;
export declare class SetMap<K, V> {
    private _map;
    get size(): number;
    has(k: K): boolean;
    add(k: K, v: V): this;
    get(k: K): Set<V>;
    keys(): Iterable<K>;
}
