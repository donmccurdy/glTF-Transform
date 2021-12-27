import { PlatformIO } from './platform-io';
/**
 * # DenoIO
 *
 * *I/O service for Deno.*
 *
 * The most common use of the I/O service is to read/write a {@link Document} with a given path.
 * Methods are also available for converting in-memory representations of raw glTF files, both
 * binary (*ArrayBuffer*) and JSON ({@link JSONDocument}).
 *
 * Usage:
 *
 * ```typescript
 * import { DenoIO } from 'https://esm.sh/@gltf-transform/core';
 * import * as path from 'https://deno.land/std/path/mod.ts';
 *
 * const io = new DenoIO(path);
 *
 * // Read.
 * let document;
 * document = io.read('model.glb');  // → Document
 * document = io.readBinary(glb);    // Uint8Array → Document
 *
 * // Write.
 * const glb = io.writeBinary(document);  // Document → Uint8Array
 * ```
 *
 * @category I/O
 */
export declare class DenoIO extends PlatformIO {
    private _path;
    constructor(path: unknown);
    protected readURI(uri: string, type: 'view'): Promise<Uint8Array>;
    protected readURI(uri: string, type: 'text'): Promise<string>;
    protected resolve(directory: string, path: string): string;
    protected dirname(uri: string): string;
}
