import { Transform } from '@gltf-transform/core';
export interface SequenceOptions {
    /** Frames per second, where one node is shown each frame. Default 10. */
    fps?: number;
    /** Pattern (regex) used to filter nodes for the sequence. Required. */
    pattern: RegExp;
    /** Name of the new animation. */
    name?: string;
    /** Whether to sort the nodes by name, or use original order. Default true. */
    sort?: boolean;
}
/**
 * Creates an {@link Animation} displaying each of the specified {@link Node}s sequentially.
 */
export declare function sequence(_options?: SequenceOptions): Transform;
