import { Extension, type ReaderContext, type WriterContext } from '@gltf-transform/core';
import { KHR_MESH_QUANTIZATION } from '../constants.js';

/**
 * [`KHR_mesh_quantization`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_mesh_quantization/)
 * expands allowed component types for vertex attributes to include 16- and 8-bit storage.
 *
 * Quantization provides a memory/precision tradeoff — depending on the application needs, 16-bit or
 * 8-bit storage can be sufficient for mesh geometry, at 1/2 or 1/4 the size. For example, a 10x10
 * mesh might be written to a uint16 {@link Accessor}, with values `0–65536`, normalized to be
 * interpreted as `0–1`. With an additional 10x scale on any node {@link Node} instantiating the
 * quantized {@link Mesh}, the model retains its original scale with a minimal quality loss and
 * up to 50% file size reduction.
 *
 * Defining no {@link ExtensionProperty} types, this {@link Extension} is simply attached to the
 * {@link Document}, and affects the entire Document by allowing more flexible use of
 * {@link Accessor} types for vertex attributes. Without the Extension, the same use of these data
 * types would yield an invalid glTF document, under the stricter core glTF specification.
 *
 * Properties:
 * - N/A
 *
 * ### Example
 *
 * ```typescript
 * import { KHRMeshQuantization } from '@gltf-transform/extensions';
 * import { quantize } from '@gltf-transform/functions';
 *
 * // Create an Extension attached to the Document.
 * const quantizationExtension = document.createExtension(KHRMeshQuantization).setRequired(true);
 *
 * // Use Uint16Array, Uint8Array, Int16Array, and Int8Array in vertex accessors manually,
 * // or apply the provided quantize() function to compute quantized accessors automatically:
 * await document.transform(quantize({
 * 	quantizePosition: 16,
 * 	quantizeNormal: 12,
 * 	quantizeTexcoord: 14
 * }));
 * ```
 *
 * For more documentation about automatic quantization, see the {@link quantize} function.
 */
export class KHRMeshQuantization extends Extension {
	public readonly extensionName: typeof KHR_MESH_QUANTIZATION = KHR_MESH_QUANTIZATION;
	public static readonly EXTENSION_NAME: typeof KHR_MESH_QUANTIZATION = KHR_MESH_QUANTIZATION;

	/** @hidden */
	read(_: ReaderContext): this {
		return this;
	}

	/** @hidden */
	write(_: WriterContext): this {
		return this;
	}
}
