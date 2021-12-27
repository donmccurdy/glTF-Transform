import { VertexLayout } from '../constants';
import { Document } from '../document';
import { Extension } from '../extension';
import { JSONDocument } from '../json-document';
import { Logger } from '../utils/';
import { WriterOptions } from './writer';
declare type PublicWriterOptions = Partial<Pick<WriterOptions, 'format' | 'basename'>>;
/**
 * # PlatformIO
 *
 * *Abstract I/O service.*
 *
 * The most common use of the I/O service is to read/write a {@link Document} with a given path.
 * Methods are also available for converting in-memory representations of raw glTF files, both
 * binary (*ArrayBuffer*) and JSON ({@link JSONDocument}).
 *
 * For platform-specific implementations, see {@link NodeIO}, {@link WebIO}, and {@link DenoIO}.
 *
 * @category I/O
 */
export declare abstract class PlatformIO {
    protected _logger: Logger;
    private _extensions;
    private _dependencies;
    private _vertexLayout;
    /** @hidden */
    lastReadBytes: number;
    /** @hidden */
    lastWriteBytes: number;
    /** Sets the {@link Logger} used by this I/O instance. Defaults to Logger.DEFAULT_INSTANCE. */
    setLogger(logger: Logger): this;
    /** Registers extensions, enabling I/O class to read and write glTF assets requiring them. */
    registerExtensions(extensions: typeof Extension[]): this;
    /** Registers dependencies used (e.g. by extensions) in the I/O process. */
    registerDependencies(dependencies: {
        [key: string]: unknown;
    }): this;
    /**
     * Sets the vertex layout method used by this I/O instance. Defaults to
     * VertexLayout.INTERLEAVED.
     */
    setVertexLayout(layout: VertexLayout): this;
    /**********************************************************************************************
     * Abstract.
     */
    protected abstract readURI(uri: string, type: 'view'): Promise<Uint8Array>;
    protected abstract readURI(uri: string, type: 'text'): Promise<string>;
    protected abstract readURI(uri: string, type: 'view' | 'text'): Promise<Uint8Array | string>;
    protected abstract resolve(directory: string, path: string): string;
    protected abstract dirname(uri: string): string;
    /**********************************************************************************************
     * Public Read API.
     */
    /** Reads a {@link Document} from the given URI. */
    read(uri: string): Promise<Document>;
    /** Loads a URI and returns a {@link JSONDocument} struct, without parsing. */
    readAsJSON(uri: string): Promise<JSONDocument>;
    /** Converts glTF-formatted JSON and a resource map to a {@link Document}. */
    readJSON(jsonDoc: JSONDocument): Promise<Document>;
    /** Converts a GLB-formatted ArrayBuffer to a {@link JSONDocument}. */
    binaryToJSON(glb: Uint8Array): Promise<JSONDocument>;
    /** Converts a GLB-formatted ArrayBuffer to a {@link Document}. */
    readBinary(glb: Uint8Array): Promise<Document>;
    /**********************************************************************************************
     * Public Write API.
     */
    /** Converts a {@link Document} to glTF-formatted JSON and a resource map. */
    writeJSON(doc: Document, _options?: PublicWriterOptions): Promise<JSONDocument>;
    /** Converts a {@link Document} to a GLB-formatted ArrayBuffer. */
    writeBinary(doc: Document): Promise<Uint8Array>;
    /**********************************************************************************************
     * Internal.
     */
    private _readGLTF;
    private _readGLB;
    private _readResourcesExternal;
    private _readResourcesInternal;
    /**
     * Creates a shallow copy of glTF-formatted {@link JSONDocument}.
     *
     * Images, Buffers, and Resources objects are deep copies so that PlatformIO can safely
     * modify them during the parsing process. Other properties are shallow copies, and buffers
     * are passed by reference.
     */
    private _copyJSON;
    /** Internal version of binaryToJSON; does not warn about external resources. */
    private _binaryToJSON;
}
export {};
