import { sync as _commandExistsSync } from 'command-exists';
import { Document, Logger, NodeIO, Texture, Transform } from '@gltf-transform/core';
export declare let spawnSync: any;
export declare let commandExistsSync: typeof _commandExistsSync;
export declare function mockSpawnSync(_spawnSync: unknown): void;
export declare function mockCommandExistsSync(_commandExistsSync: (n: string) => boolean): void;
export declare function formatLong(x: number): string;
export declare function formatBytes(bytes: number, decimals?: number): string;
export declare function formatParagraph(str: string): string;
export declare function formatHeader(title: string): string;
/** Returns names of all texture slots using the given texture. */
export declare function getTextureSlots(doc: Document, texture: Texture): string[];
/** Returns bit mask of all texture channels used by the given texture. */
export declare function getTextureChannels(doc: Document, texture: Texture): number;
/** Helper class for managing a CLI command session. */
export declare class Session {
    private _io;
    private _logger;
    private _input;
    private _output;
    constructor(_io: NodeIO, _logger: Logger, _input: string, _output: string);
    static create(io: NodeIO, logger: unknown, input: unknown, output: unknown): Session;
    transform(...transforms: Transform[]): Promise<void>;
}
