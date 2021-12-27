import { NodeIO, Transform } from '@gltf-transform/core';
export interface MergeOptions {
    io: NodeIO;
    paths: string[];
    partition: boolean;
}
declare const merge: (options: MergeOptions) => Transform;
export { merge };
