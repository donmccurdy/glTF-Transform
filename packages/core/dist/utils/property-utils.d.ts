import { GraphEdge } from 'property-graph';
import { BufferViewUsage } from '../constants';
import type { Property } from '../properties';
export declare type Ref = GraphEdge<Property, Property>;
export declare type RefMap = {
    [key: string]: Ref;
};
export declare type UnknownRef = Ref | Ref[] | RefMap | unknown;
export declare function equalsRef(refA: Ref, refB: Ref): boolean;
export declare function equalsRefList(refListA: Ref[], refListB: Ref[]): boolean;
export declare function equalsRefMap(refMapA: RefMap, refMapB: RefMap): boolean;
export declare function equalsArray(a: ArrayLike<unknown> | null, b: ArrayLike<unknown> | null): boolean;
export declare type RefAttributes = Record<string, unknown>;
export interface AccessorRefAttributes extends RefAttributes {
    /** Usage role of an accessor reference. */
    usage: BufferViewUsage | string;
}
export interface TextureRefAttributes extends RefAttributes {
    /** Bitmask for {@link TextureChannel TextureChannels} used by a texture reference. */
    channels: number;
}
