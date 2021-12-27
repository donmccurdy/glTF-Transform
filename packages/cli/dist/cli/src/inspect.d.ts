import { JSONDocument, Logger, NodeIO, WebIO } from '@gltf-transform/core';
export declare enum InspectFormat {
    PRETTY = "pretty",
    CSV = "csv",
    MD = "md"
}
export declare function inspect(jsonDoc: JSONDocument, io: NodeIO | WebIO, logger: Logger, format: InspectFormat): Promise<void>;
