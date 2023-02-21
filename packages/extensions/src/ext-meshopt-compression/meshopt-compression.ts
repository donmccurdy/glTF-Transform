import {
	Accessor,
	Buffer,
	BufferUtils,
	Extension,
	GLB_BUFFER,
	GLTF,
	PropertyType,
	ReaderContext,
	WriterContext,
} from '@gltf-transform/core';
import { EncoderMethod, MeshoptBufferViewExtension, MeshoptFilter } from './constants.js';
import { EXT_MESHOPT_COMPRESSION } from '../constants.js';
import { getMeshoptFilter, getMeshoptMode, getTargetPath, prepareAccessor } from './encoder.js';
import { isFallbackBuffer } from './decoder.js';
import type { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const NAME = EXT_MESHOPT_COMPRESSION;

interface EncoderOptions {
	method?: EncoderMethod;
}

const DEFAULT_ENCODER_OPTIONS: Required<EncoderOptions> = {
	method: EncoderMethod.QUANTIZE,
};

type MeshoptBufferView = { extensions: { [NAME]: MeshoptBufferViewExtension } };
type EncodedBufferView = GLTF.IBufferView & MeshoptBufferView;

/**
 * # EXTMeshoptCompression
 *
 * [`EXT_meshopt_compression`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Vendor/EXT_meshopt_compression/)
 * provides compression and fast decoding for geometry, morph targets, and animations.
 *
 * [[include:_VENDOR_EXTENSIONS.md]]
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
 * import { reorder, quantize } from '@gltf-transform/functions';
 * import { EXTMeshoptCompression } from '@gltf-transform/extensions';
 * import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
 *
 * await MeshoptDecoder.ready;
 * await MeshoptEncoder.ready;
 *
 * const io = new NodeIO()
 *	.registerExtensions([EXTMeshoptCompression])
 *	.registerDependencies({
 *		'meshopt.decoder': MeshoptDecoder,
 *		'meshopt.encoder': MeshoptEncoder,
 *	});
 *
 * // Read and decode.
 * const document = await io.read('compressed.glb');
 *
 * // Write and encode. (Medium, -c)
 * await document.transform(
 * 	reorder({encoder: MeshoptEncoder}),
 * 	quantize()
 * );
 * document.createExtension(EXTMeshoptCompression)
 * 	.setRequired(true)
 * 	.setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
 * await io.write('compressed-medium.glb', document);
 *
 * // Write and encode. (High, -cc)
 * await document.transform(
 * 	reorder({encoder: MeshoptEncoder}),
 * 	quantize({pattern: /^(POSITION|TEXCOORD|JOINTS|WEIGHTS)(_\d+)?$/}),
 * );
 * document.createExtension(EXTMeshoptCompression)
 * 	.setRequired(true)
 * 	.setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
 * await io.write('compressed-high.glb', document);
 * ```
 */
export class EXTMeshoptCompression extends Extension {
	public readonly extensionName = NAME;
	/** @hidden */
	public readonly prereadTypes = [PropertyType.BUFFER, PropertyType.PRIMITIVE];
	/** @hidden */
	public readonly prewriteTypes = [PropertyType.BUFFER, PropertyType.ACCESSOR];
	/** @hidden */
	public readonly readDependencies = ['meshopt.decoder'];
	/** @hidden */
	public readonly writeDependencies = ['meshopt.encoder'];

	public static readonly EXTENSION_NAME = NAME;
	public static readonly EncoderMethod = EncoderMethod;

	private _decoder: typeof MeshoptDecoder | null = null;
	private _decoderFallbackBufferMap = new Map<Buffer, Buffer>();
	private _encoder: typeof MeshoptEncoder | null = null;
	private _encoderOptions: Required<EncoderOptions> = DEFAULT_ENCODER_OPTIONS;
	private _encoderFallbackBuffer: Buffer | null = null;
	private _encoderBufferViews: { [key: string]: EncodedBufferView } = {};
	private _encoderBufferViewData: { [key: string]: Uint8Array[] } = {};
	private _encoderBufferViewAccessors: { [key: string]: GLTF.IAccessor[] } = {};

	/** @hidden */
	public install(key: string, dependency: unknown): this {
		if (key === 'meshopt.decoder') {
			this._decoder = dependency as typeof MeshoptDecoder;
		}
		if (key === 'meshopt.encoder') {
			this._encoder = dependency as typeof MeshoptEncoder;
		}
		return this;
	}

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
	 * import { EXTMeshoptCompression } from '@gltf-transform/extensions';
	 *
	 * doc.createExtension(EXTMeshoptCompression)
	 * 	.setRequired(true)
	 * 	.setEncoderOptions({
	 * 		method: EXTMeshoptCompression.EncoderMethod.QUANTIZE
	 * 	});
	 * ```
	 */
	public setEncoderOptions(options: EncoderOptions): this {
		this._encoderOptions = { ...DEFAULT_ENCODER_OPTIONS, ...options };
		return this;
	}

	/**********************************************************************************************
	 * Decoding.
	 */

	/** @internal Checks preconditions, decodes buffer views, and creates decoded primitives. */
	public preread(context: ReaderContext, propertyType: PropertyType): this {
		if (!this._decoder) {
			if (!this.isRequired()) return this;
			throw new Error(`[${NAME}] Please install extension dependency, "meshopt.decoder".`);
		}
		if (!this._decoder.supported) {
			if (!this.isRequired()) return this;
			throw new Error(`[${NAME}]: Missing WASM support.`);
		}

		if (propertyType === PropertyType.BUFFER) {
			this._prereadBuffers(context);
		} else if (propertyType === PropertyType.PRIMITIVE) {
			this._prereadPrimitives(context);
		}

		return this;
	}

	/** @internal Decode buffer views. */
	private _prereadBuffers(context: ReaderContext): void {
		const jsonDoc = context.jsonDoc;

		const viewDefs = jsonDoc.json.bufferViews || [];
		viewDefs.forEach((viewDef, index) => {
			if (!viewDef.extensions || !viewDef.extensions[NAME]) return;

			const meshoptDef = viewDef.extensions[NAME] as MeshoptBufferViewExtension;
			const byteOffset = meshoptDef.byteOffset || 0;
			const byteLength = meshoptDef.byteLength || 0;
			const count = meshoptDef.count;
			const stride = meshoptDef.byteStride;
			const result = new Uint8Array(count * stride);

			const bufferDef = jsonDoc.json.buffers![meshoptDef.buffer];
			// TODO(cleanup): Should be encapsulated in writer-context.ts.
			const resource = bufferDef.uri ? jsonDoc.resources[bufferDef.uri] : jsonDoc.resources[GLB_BUFFER];
			const source = BufferUtils.toView(resource, byteOffset, byteLength);

			this._decoder!.decodeGltfBuffer(result, count, stride, source, meshoptDef.mode, meshoptDef.filter);

			context.bufferViews[index] = result;
		});
	}

	/**
	 * Mark fallback buffers and replacements.
	 *
	 * Note: Alignment with primitives is arbitrary; this just needs to happen
	 * after Buffers have been parsed.
	 * @internal
	 */
	private _prereadPrimitives(context: ReaderContext): void {
		const jsonDoc = context.jsonDoc;
		const viewDefs = jsonDoc.json.bufferViews || [];

		//
		viewDefs.forEach((viewDef) => {
			if (!viewDef.extensions || !viewDef.extensions[NAME]) return;

			const meshoptDef = viewDef.extensions[NAME] as MeshoptBufferViewExtension;

			const buffer = context.buffers[meshoptDef.buffer];
			const fallbackBuffer = context.buffers[viewDef.buffer];
			const fallbackBufferDef = jsonDoc.json.buffers![viewDef.buffer];
			if (isFallbackBuffer(fallbackBufferDef)) {
				this._decoderFallbackBufferMap.set(fallbackBuffer, buffer);
			}
		});
	}

	/** @hidden Removes Fallback buffers, if extension is required. */
	public read(_context: ReaderContext): this {
		if (!this.isRequired()) return this;

		// Replace fallback buffers.
		for (const [fallbackBuffer, buffer] of this._decoderFallbackBufferMap) {
			for (const parent of fallbackBuffer.listParents()) {
				if (parent instanceof Accessor) {
					parent.swap(fallbackBuffer, buffer);
				}
			}
			fallbackBuffer.dispose();
		}

		return this;
	}

	/**********************************************************************************************
	 * Encoding.
	 */

	/** @internal Claims accessors that can be compressed and writes compressed buffer views. */
	public prewrite(context: WriterContext, propertyType: PropertyType): this {
		if (propertyType === PropertyType.ACCESSOR) {
			this._prewriteAccessors(context);
		} else if (propertyType === PropertyType.BUFFER) {
			this._prewriteBuffers(context);
		}
		return this;
	}

	/** @internal Claims accessors that can be compressed. */
	private _prewriteAccessors(context: WriterContext): void {
		const json = context.jsonDoc.json;
		const encoder = this._encoder!;
		const options = this._encoderOptions;

		const fallbackBuffer = this.document.createBuffer(); // Disposed on write.
		const fallbackBufferIndex = this.document.getRoot().listBuffers().indexOf(fallbackBuffer);

		this._encoderFallbackBuffer = fallbackBuffer;
		this._encoderBufferViews = {};
		this._encoderBufferViewData = {};
		this._encoderBufferViewAccessors = {};

		for (const accessor of this.document.getRoot().listAccessors()) {
			// See: https://github.com/donmccurdy/glTF-Transform/pull/323#issuecomment-898791251
			// Example: https://skfb.ly/6qAD8
			if (getTargetPath(accessor) === 'weights') continue;

			// See: https://github.com/donmccurdy/glTF-Transform/issues/289
			if (accessor.getSparse()) continue;

			const usage = context.getAccessorUsage(accessor);
			const mode = getMeshoptMode(accessor, usage);
			const filter =
				options.method === EncoderMethod.FILTER
					? getMeshoptFilter(accessor, this.document)
					: { filter: MeshoptFilter.NONE };
			const preparedAccessor = prepareAccessor(accessor, encoder, mode, filter);
			const { array, byteStride } = preparedAccessor;

			const buffer = accessor.getBuffer();
			if (!buffer) throw new Error(`${NAME}: Missing buffer for accessor.`);
			const bufferIndex = this.document.getRoot().listBuffers().indexOf(buffer);

			// Buffer view grouping key.
			const key = [usage, mode, filter.filter, byteStride, bufferIndex].join(':');

			let bufferView = this._encoderBufferViews[key];
			let bufferViewData = this._encoderBufferViewData[key];
			let bufferViewAccessors = this._encoderBufferViewAccessors[key];

			// Write new buffer view, if needed.
			if (!bufferView || !bufferViewData) {
				bufferViewAccessors = this._encoderBufferViewAccessors[key] = [];
				bufferViewData = this._encoderBufferViewData[key] = [];
				bufferView = this._encoderBufferViews[key] = {
					buffer: fallbackBufferIndex,
					target: WriterContext.USAGE_TO_TARGET[usage],
					byteOffset: 0,
					byteLength: 0,
					byteStride: usage === WriterContext.BufferViewUsage.ARRAY_BUFFER ? byteStride : undefined,
					extensions: {
						[NAME]: {
							buffer: bufferIndex,
							byteOffset: 0,
							byteLength: 0,
							mode: mode,
							filter: filter.filter !== MeshoptFilter.NONE ? filter.filter : undefined,
							byteStride: byteStride,
							count: 0,
						},
					},
				};
			}

			// Write accessor.
			const accessorDef = context.createAccessorDef(accessor);
			accessorDef.componentType = preparedAccessor.componentType;
			accessorDef.normalized = preparedAccessor.normalized;
			accessorDef.byteOffset = bufferView.byteLength;
			if (accessorDef.min && preparedAccessor.min) accessorDef.min = preparedAccessor.min;
			if (accessorDef.max && preparedAccessor.max) accessorDef.max = preparedAccessor.max;
			context.accessorIndexMap.set(accessor, json.accessors!.length);
			json.accessors!.push(accessorDef);
			bufferViewAccessors.push(accessorDef);

			// Update buffer view.
			bufferViewData.push(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
			bufferView.byteLength += array.byteLength;
			bufferView.extensions.EXT_meshopt_compression.count += accessor.getCount();
		}
	}

	/** @internal Writes compressed buffer views. */
	private _prewriteBuffers(context: WriterContext): void {
		const encoder = this._encoder!;

		for (const key in this._encoderBufferViews) {
			const bufferView = this._encoderBufferViews[key];
			const bufferViewData = this._encoderBufferViewData[key];
			const buffer = this.document.getRoot().listBuffers()[bufferView.extensions[NAME].buffer];
			const otherBufferViews = context.otherBufferViews.get(buffer) || [];

			const { count, byteStride, mode } = bufferView.extensions[NAME];
			const srcArray = BufferUtils.concat(bufferViewData);
			const dstArray = encoder.encodeGltfBuffer(srcArray, count, byteStride, mode);
			const compressedData = BufferUtils.pad(dstArray);

			bufferView.extensions[NAME].byteLength = dstArray.byteLength;

			bufferViewData.length = 0;
			bufferViewData.push(compressedData);
			otherBufferViews.push(compressedData);
			context.otherBufferViews.set(buffer, otherBufferViews);
		}
	}

	/** @hidden Puts encoded data into glTF output. */
	public write(context: WriterContext): this {
		let fallbackBufferByteOffset = 0;

		// Write final encoded buffer view properties.
		for (const key in this._encoderBufferViews) {
			const bufferView = this._encoderBufferViews[key];
			const bufferViewData = this._encoderBufferViewData[key][0];
			const bufferViewIndex = context.otherBufferViewsIndexMap.get(bufferViewData)!;

			const bufferViewAccessors = this._encoderBufferViewAccessors[key];
			for (const accessorDef of bufferViewAccessors) {
				accessorDef.bufferView = bufferViewIndex;
			}

			const finalBufferViewDef = context.jsonDoc.json.bufferViews![bufferViewIndex];
			const compressedByteOffset = finalBufferViewDef.byteOffset || 0;

			Object.assign(finalBufferViewDef, bufferView);
			finalBufferViewDef.byteOffset = fallbackBufferByteOffset;
			const bufferViewExtensionDef = finalBufferViewDef.extensions![NAME] as MeshoptBufferViewExtension;
			bufferViewExtensionDef.byteOffset = compressedByteOffset;

			fallbackBufferByteOffset += BufferUtils.padNumber(bufferView.byteLength);
		}

		// Write final fallback buffer.
		const fallbackBuffer = this._encoderFallbackBuffer!;
		const fallbackBufferIndex = context.bufferIndexMap.get(fallbackBuffer)!;
		const fallbackBufferDef = context.jsonDoc.json.buffers![fallbackBufferIndex];
		fallbackBufferDef.byteLength = fallbackBufferByteOffset;
		fallbackBufferDef.extensions = { [NAME]: { fallback: true } };
		fallbackBuffer.dispose();

		return this;
	}
}
