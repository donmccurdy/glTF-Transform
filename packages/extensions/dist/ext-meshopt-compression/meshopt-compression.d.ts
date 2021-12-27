import { Extension, PropertyType, ReaderContext, WriterContext } from '@gltf-transform/core';
import { EncoderMethod } from './constants';
interface EncoderOptions {
    method?: EncoderMethod;
}
/**
 * # MeshoptCompression
 *
 * [`EXT_meshopt_compression`](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Vendor/EXT_meshopt_compression/)
 * provides compression and fast decoding for geometry, morph targets, and animations.
 *
 * [[include:VENDOR_EXTENSIONS_NOTE.md]]
 *
 * Meshopt compression (based on the [meshoptimizer](https://github.com/zeux/meshoptimizer)
 * library) offers a lightweight decoder with very fast runtime decompression, and is
 * appropriate for models of any size. Meshopt can reduce the transmission sizes of geometry,
 * morph targets, animation, and other numeric data stored in buffer views. When textures are
 * large, other complementary compression methods should be used as well.
 *
 * For the full benefits of meshopt compression, **apply gzip, brotli, or another lossless
 * compression method** to the resulting .glb, .gltf, or .bin files. Meshopt specifically
 * pre-optimizes assets for this purpose — without this secondary compression, the size
 * reduction is considerably less.
 *
 * Be aware that decompression happens before uploading to the GPU. While Meshopt decoding is
 * considerably faster than Draco decoding, neither compression method will improve runtime
 * performance directly. To improve framerate, you'll need to simplify the geometry by reducing
 * vertex count or draw calls — not just compress it. Finally, be aware that Meshopt compression is
 * lossy: repeatedly compressing and decompressing a model in a pipeline will lose precision, so
 * compression should generally be the last stage of an art workflow, and uncompressed original
 * files should be kept.
 *
 * The meshoptimizer library ([github](https://github.com/zeux/meshoptimizer/tree/master/js),
 * [npm](https://www.npmjs.com/package/meshoptimizer)) is a required dependency for reading or
 * writing files, and must be provided by the application. Compression may alternatively be applied
 * with the [gltfpack](https://github.com/zeux/meshoptimizer/tree/master/gltf) tool.
 *
 * ### Example
 *
 * ```typescript
 * import { NodeIO } from '@gltf-transform/core';
 * import { MeshoptCompression } from '@gltf-transform/extensions';
 * import { MeshoptDecoder } from 'meshoptimizer';
 *
 * await MeshoptDecoder.ready;
 *
 * const io = new NodeIO()
 *	.registerExtensions([MeshoptCompression])
 *	.registerDependencies({
 *		'meshopt.decoder': MeshoptDecoder,
 *		'meshopt.encoder': MeshoptEncoder,
 *	});
 *
 * // Read and decode.
 * const document = await io.read('compressed.glb');
 *
 * // Write and encode. (Medium, -c)
 * await document.transform(reorder(), quantize());
 * document.createExtension(MeshoptCompression)
 * 	.setRequired(true)
 * 	.setEncoderOptions({ method: MeshoptCompression.EncoderMethod.QUANTIZE });
 * await io.write('compressed-medium.glb', document);
 *
 * // Write and encode. (High, -cc)
 * await document.transform(
 * 	reorder(),
 * 	quantize({pattern: /^(POSITION|TEXCOORD|JOINTS|WEIGHTS)(_\d+)?$/}),
 * );
 * document.createExtension(MeshoptCompression)
 * 	.setRequired(true)
 * 	.setEncoderOptions({ method: MeshoptCompression.EncoderMethod.FILTER });
 * await io.write('compressed-high.glb', document);
 * ```
 */
export declare class MeshoptCompression extends Extension {
    readonly extensionName = "EXT_meshopt_compression";
    /** @hidden */
    readonly prereadTypes: PropertyType[];
    /** @hidden */
    readonly prewriteTypes: PropertyType[];
    /** @hidden */
    readonly readDependencies: string[];
    /** @hidden */
    readonly writeDependencies: string[];
    static readonly EXTENSION_NAME = "EXT_meshopt_compression";
    static readonly EncoderMethod: typeof EncoderMethod;
    private _decoder;
    private _decoderFallbackBufferMap;
    private _encoder;
    private _encoderOptions;
    private _encoderFallbackBuffer;
    private _encoderBufferViews;
    private _encoderBufferViewData;
    private _encoderBufferViewAccessors;
    /** @hidden */
    install(key: string, dependency: unknown): this;
    /**
     * Configures Meshopt options for quality/compression tuning. The two methods rely on different
     * pre-processing before compression, and should be compared on the basis of (a) quality/loss
     * and (b) final asset size after _also_ applying a lossless compression such as gzip or brotli.
     *
     * - QUANTIZE: Default. Pre-process with {@link quantize quantize()} (lossy to specified
     * 	precision) before applying lossless Meshopt compression. Offers a considerable compression
     * 	ratio with or without further supercompression. Equivalent to `gltfpack -c`.
     * - FILTER: Pre-process with lossy filters to improve compression, before applying lossless
     *	Meshopt compression. While output may initially be larger than with the QUANTIZE method,
     *	this method will benefit more from supercompression (e.g. gzip or brotli). Equivalent to
     * 	`gltfpack -cc`.
     *
     * Output with the FILTER method will generally be smaller after supercompression (e.g. gzip or
     * brotli) is applied, but may be larger than QUANTIZE output without it. Decoding is very fast
     * with both methods.
     *
     * Example:
     *
     * ```ts
     * doc.createExtension(MeshoptCompression)
     * 	.setRequired(true)
     * 	.setEncoderOptions({
     * 		method: MeshoptCompression.EncoderMethod.QUANTIZE
     * 	});
     * ```
     */
    setEncoderOptions(options: EncoderOptions): this;
    /** @hidden Removes Fallback buffers, if extension is required. */
    read(_context: ReaderContext): this;
    /** @hidden Puts encoded data into glTF output. */
    write(context: WriterContext): this;
}
export {};
