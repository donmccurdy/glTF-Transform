import { Logger } from '@gltf-transform/core';
export interface ValidateOptions {
    limit: number;
    ignore: string[];
}
export declare function validate(input: string, options: ValidateOptions, logger: Logger): void;
