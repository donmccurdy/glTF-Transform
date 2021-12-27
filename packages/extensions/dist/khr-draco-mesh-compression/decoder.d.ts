import { GLTF, TypedArray } from '@gltf-transform/core';
import type { Attribute, Decoder, DecoderModule, Mesh } from 'draco3dgltf';
export declare let decoderModule: DecoderModule;
export declare function decodeGeometry(decoder: Decoder, data: Uint8Array): Mesh;
export declare function decodeIndex(decoder: Decoder, mesh: Mesh): Uint16Array | Uint32Array;
export declare function decodeAttribute(decoder: Decoder, mesh: Mesh, attribute: Attribute, accessorDef: GLTF.IAccessor): TypedArray;
export declare function initDecoderModule(_decoderModule: DecoderModule): void;
