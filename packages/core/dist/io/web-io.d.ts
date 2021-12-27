import { PlatformIO } from './platform-io';
/**
 * # WebIO
 *
 * *I/O service for Web.*
 *
 * The most common use of the I/O service is to read/write a {@link Document} with a given path.
 * Methods are also available for converting in-memory representations of raw glTF files, both
 * binary (*ArrayBuffer*) and JSON ({@link JSONDocument}).
 *
 * Usage:
 *
 * ```typescript
 * import { WebIO } from '@gltf-transform/core';
 *
 * const io = new WebIO({credentials: 'include'});
 *
 * // Read.
 * let document;
 * document = await io.read('model.glb');  // → Document
 * document = await io.readBinary(glb);    // Uint8Array → Document
 *
 * // Write.
 * const glb = await io.writeBinary(document); // Document → Uint8Array
 * ```
 *
 * @category I/O
 */
export declare class WebIO extends PlatformIO {
    private readonly _fetchConfig;
    /**
     * Constructs a new WebIO service. Instances are reusable.
     * @param _fetchConfig Configuration object for Fetch API.
     */
    constructor(_fetchConfig?: RequestInit);
    protected readURI(uri: string, type: 'view'): Promise<Uint8Array>;
    protected readURI(uri: string, type: 'text'): Promise<string>;
    protected resolve(directory: string, path: string): string;
    protected dirname(uri: string): string;
}
