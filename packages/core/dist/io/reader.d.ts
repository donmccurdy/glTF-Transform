import { Extension } from '../extension';
import { Logger } from '../utils';
export interface ReaderOptions {
    logger?: Logger;
    extensions: typeof Extension[];
    dependencies: {
        [key: string]: unknown;
    };
}
