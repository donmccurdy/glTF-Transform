import { Format, VertexLayout } from '../constants';
import { Extension } from '../extension';
import { Logger } from '../utils';
export interface WriterOptions {
    format: Format;
    logger?: Logger;
    basename?: string;
    vertexLayout?: VertexLayout;
    dependencies?: {
        [key: string]: unknown;
    };
    extensions?: typeof Extension[];
}
