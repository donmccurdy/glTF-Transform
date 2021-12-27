import { PreparedAccessor, MeshoptFilter, MeshoptMode } from './constants';
import { Accessor, Document, GLTF, TypedArray } from '@gltf-transform/core';
import type { MeshoptEncoder } from 'meshoptimizer';
/** Pre-processes array with required filters or padding. */
export declare function prepareAccessor(accessor: Accessor, encoder: typeof MeshoptEncoder, mode: MeshoptMode, filterOptions: {
    filter: MeshoptFilter;
    bits?: number;
}): PreparedAccessor;
/** Pads array to 4 byte alignment, required for Meshopt ATTRIBUTE buffer views. */
export declare function padArrayElements<T extends TypedArray>(srcArray: T, elementSize: number): T;
export declare function getMeshoptMode(accessor: Accessor, usage: string): MeshoptMode;
export declare function getMeshoptFilter(accessor: Accessor, doc: Document): {
    filter: MeshoptFilter;
    bits?: number;
};
export declare function getTargetPath(accessor: Accessor): GLTF.AnimationChannelTargetPath | null;
