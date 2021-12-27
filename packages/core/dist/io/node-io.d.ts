import { Document } from '../document';
import { PlatformIO } from './platform-io';
/**
 * # NodeIO
 *
 * *I/O service for Node.js.*
 *
 * The most common use of the I/O service is to read/write a {@link Document} with a given path.
 * Methods are also available for converting in-memory representations of raw glTF files, both
 * binary (*ArrayBuffer*) and JSON ({@link JSONDocument}).
 *
 * Usage:
 *
 * ```typescript
 * const { NodeIO } = require('@gltf-transform/core');
 *
 * const io = new NodeIO();
 *
 * // Read.
 * let document;
 * document = await io.read('model.glb'); // → Document
 * document = await io.readBinary(glb);   // Uint8Array → Document
 *
 * // Write.
 * await io.write('model.glb', document);      // → void
 * const glb = await io.writeBinary(document); // Document → Uint8Array
 * ```
 *
 * @category I/O
 */
export declare class NodeIO extends PlatformIO {
    private _fs;
    private _path;
    _nodeFetch: any;
    _httpRegex: RegExp;
    allowFetch: boolean;
    /** Constructs a new NodeIO service. Instances are reusable. */
    constructor();
    protected readURI(uri: string, type: 'view'): Promise<Uint8Array>;
    protected readURI(uri: string, type: 'text'): Promise<string>;
    protected resolve(directory: string, path: string): string;
    protected dirname(uri: string): string;
    /**********************************************************************************************
     * Public.
     */
    /** Writes a {@link Document} instance to a local path. */
    write(uri: string, doc: Document): Promise<void>;
}
