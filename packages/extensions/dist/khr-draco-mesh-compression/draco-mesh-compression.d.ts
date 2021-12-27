import { Extension, PropertyType, ReaderContext, WriterContext } from '@gltf-transform/core';
import { EncoderMethod, EncoderOptions } from './encoder';
/**
 * # DracoMeshCompression
 *
 * [`KHR_draco_mesh_compression`](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_draco_mesh_compression/)
 * provides advanced compression for mesh geometry.
 *
 * For models where geometry is a significant factor (>1 MB), Draco can reduce filesize by ~95%
 * in many cases. When animation or textures are large, other complementary compression methods
 * should be used as well. For geometry <1MB, the size of the WASM decoder library may outweigh
 * size savings.
 *
 * Be aware that decompression happens before uploading to the GPU — this will add some latency to
 * the parsing process, and means that compressing geometry with  Draco does _not_ affect runtime
 * performance. To improve framerate, you'll need to simplify the geometry by reducing vertex count
 * or draw calls — not just compress it. Finally, be aware that Draco compression is lossy:
 * repeatedly compressing and decompressing a model in a pipeline will lose precision, so
 * compression should generally be the last stage of an art workflow, and uncompressed original
 * files should be kept.
 *
 * A decoder or encoder from the `draco3dgltf` npm module for Node.js (or
 * [elsewhere for web](https://stackoverflow.com/a/66978236/1314762)) is required for reading and writing,
 * and must be provided by the application.
 *
 * ### Encoding options
 *
 * Two compression methods are available: 'edgebreaker' and 'sequential'. The
 * edgebreaker method will give higher compression in general, but changes the
 * order of the model's vertices. To preserve index order, use sequential
 * compression. When a mesh uses morph targets, or a high decoding speed is
 * selected, sequential compression will automatically be chosen.
 *
 * Both speed options affect the encoder's choice of algorithms. For example, a
 * requirement for fast decoding may prevent the encoder from using the best
 * compression methods even if the encoding speed is set to 0. In general, the
 * faster of the two options limits the choice of features that can be used by the
 * encoder. Setting --decodeSpeed to be faster than the --encodeSpeed may allow
 * the encoder to choose the optimal method out of the available features for the
 * given --decodeSpeed.
 *
 * ### Example
 *
 * ```typescript
 * import { NodeIO } from '@gltf-transform/core';
 * import { DracoMeshCompression } from '@gltf-transform/extensions';
 *
 * import draco3d from 'draco3dgltf';
 *
 * // ...
 *
 * const io = new NodeIO()
 *	.registerExtensions([DracoMeshCompression])
 *	.registerDependencies({
 *		'draco3d.decoder': await draco3d.createDecoderModule(), // Optional.
 *		'draco3d.encoder': await draco3d.createEncoderModule(), // Optional.
 *	});
 *
 * // Read and decode.
 * const document = await io.read('compressed.glb');
 *
 * // Write and encode.
 * document.createExtension(DracoMeshCompression)
 * 	.setRequired(true)
 * 	.setEncoderOptions({
 * 		method: DracoMeshCompression.EncoderMethod.EDGEBREAKER,
 * 		encodeSpeed: 5,
 * 		decodeSpeed: 5,
 * 	});
 * await io.write('compressed.glb', document);
 * ```
 */
export declare class DracoMeshCompression extends Extension {
    readonly extensionName = "KHR_draco_mesh_compression";
    /** @hidden */
    readonly prereadTypes: PropertyType[];
    /** @hidden */
    readonly prewriteTypes: PropertyType[];
    /** @hidden */
    readonly readDependencies: string[];
    /** @hidden */
    readonly writeDependencies: string[];
    static readonly EXTENSION_NAME = "KHR_draco_mesh_compression";
    /**
     * Compression method. `EncoderMethod.EDGEBREAKER` usually provides a higher compression ratio,
     * while `EncoderMethod.SEQUENTIAL` better preserves original verter order.
     */
    static readonly EncoderMethod: typeof EncoderMethod;
    private _decoderModule;
    private _encoderModule;
    private _encoderOptions;
    /** @hidden */
    install(key: string, dependency: unknown): this;
    /**
     * Sets Draco compression options. Compression does not take effect until the Document is
     * written with an I/O class.
     *
     * Defaults:
     * ```
     * decodeSpeed?: number = 5;
     * encodeSpeed?: number = 5;
     * method?: EncoderMethod = EncoderMethod.EDGEBREAKER;
     * quantizationBits?: {[ATTRIBUTE_NAME]: bits};
     * quantizationVolume?: 'mesh' | 'scene' | bbox = 'mesh';
     * ```
     */
    setEncoderOptions(options: EncoderOptions): this;
    /** @hidden */
    preread(context: ReaderContext): this;
    /** @hidden */
    read(_context: ReaderContext): this;
    /** @hidden */
    prewrite(context: WriterContext, _propertyType: PropertyType): this;
    /** @hidden */
    write(context: WriterContext): this;
}
